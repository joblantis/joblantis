-- JOBLANTIS – 5. fázis: nincs ghosting automatizmus, utókövetés, admin funkciók, ütemezés

alter type public.notification_kind add value if not exists 'reminder';

-- ───────────── nincs ghosting: 3. napon emlékeztető, 5. napon automatikus lezárás ─────────────
-- Az elutasítás és az automatikus lezárás külön, udvarias szöveget kap; lezáráskor a munkáltató is értesül.
create or replace function public.notify_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_job record;
  v_name text;
begin
  select j.title, c.name as company_name, j.company_id into v_job
  from public.jobs j join public.companies c on c.id = j.company_id where j.id = new.job_id;
  select coalesce(nullif(full_name, ''), 'Jelölt') into v_name from public.profiles where id = new.candidate_id;

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    select cm.user_id, 'application_new', new.id,
      'Új jelentkező: ' || v_job.title,
      v_name || ' jelentkezett a(z) „' || v_job.title || '” állásra. Kérjük, 5 napon belül válaszolj neki.',
      '/munkaltato/jelentkezes/' || new.id
    from public.company_members cm where cm.company_id = v_job.company_id;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'rejected' then
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    values (new.candidate_id, 'application_rejected', new.id,
      'Válasz a jelentkezésedre: ' || v_job.title,
      'Köszönjük, hogy jelentkeztél a(z) ' || v_job.company_name || ' „' || v_job.title || '” állására. '
        || 'Ezúttal más jelölttel haladnak tovább, de a profilod alapján sok más hely várhat rád. Sok sikert a keresésben!',
      '/jelolt/jelentkezesek');
  elsif new.status = 'auto_closed' then
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    values (new.candidate_id, 'application_rejected', new.id,
      'Lezárult a jelentkezésed: ' || v_job.title,
      'A(z) ' || v_job.company_name || ' 5 napon belül nem válaszolt a(z) „' || v_job.title || '” állásra adott jelentkezésedre, '
        || 'ezért – hogy ne várj feleslegesen – lezártuk. Ez nem rólad szól: nézd meg a további, hozzád illő állásokat!',
      '/jelolt/allaskereses');
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    select cm.user_id, 'reminder', new.id,
      'Automatikusan lezárva: ' || v_name,
      v_name || ' jelentkezése a(z) „' || v_job.title || '” állásra 5 nap válasz nélkül lezárult, a jelölt értesítést kapott.',
      '/munkaltato/jelentkezes/' || new.id
    from public.company_members cm where cm.company_id = v_job.company_id;
  elsif new.status = 'viewed' then
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    values (new.candidate_id, 'application_status', new.id,
      v_job.company_name || ' érdeklődik irántad',
      'A(z) „' || v_job.title || '” állásra adott jelentkezésed továbbjutott. Megnyílt a chat a munkáltatóval.',
      '/uzenetek/' || new.id);
  elsif new.status in ('trial', 'offer', 'hired') then
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    values (new.candidate_id, 'application_status', new.id,
      case new.status when 'trial' then 'Próbanap: ' when 'offer' then 'Ajánlatot kaptál: ' else 'Felvettek: ' end || v_job.title,
      case new.status
        when 'trial' then 'A(z) ' || v_job.company_name || ' próbanapra hív. Az időpontot a chatben egyeztethetitek.'
        when 'offer' then 'A(z) ' || v_job.company_name || ' ajánlatot tesz neked. Nézd meg a chatet!'
        else 'Gratulálunk! A(z) ' || v_job.company_name || ' felvett a(z) „' || v_job.title || '” állásra.'
      end,
      '/uzenetek/' || new.id);
  end if;
  return new;
end $$;
revoke execute on function public.notify_application() from public, anon, authenticated;

create or replace function public.process_no_ghosting()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_reminded int;
  v_closed int;
begin
  -- 3. nap: egyszeri emlékeztető a cég tagjainak
  with due as (
    select a.id from public.applications a
    where a.status = 'new' and a.reminder_sent_at is null
      and a.created_at <= now() - interval '3 days' and a.response_due_at > now()
    for update skip locked
  ),
  upd as (
    update public.applications a set reminder_sent_at = now()
    from due where a.id = due.id
    returning a.id, a.job_id, a.candidate_id, a.response_due_at
  ),
  ins as (
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    select cm.user_id, 'reminder', upd.id,
      'Válaszra vár: ' || coalesce(nullif(p.full_name, ''), 'jelölt') || ' – ' || j.title,
      'Ez a jelentkezés 3 napja vár válaszra. Ha '
        || to_char(upd.response_due_at at time zone 'Europe/Budapest', 'YYYY.MM.DD. HH24:MI')
        || '-ig nem reagálsz (érdekel vagy elutasítás), automatikusan lezárul, és a jelölt értesítést kap.',
      '/munkaltato/jelentkezes/' || upd.id
    from upd
    join public.jobs j on j.id = upd.job_id
    join public.company_members cm on cm.company_id = j.company_id
    left join public.profiles p on p.id = upd.candidate_id
    returning 1
  )
  select count(*) into v_reminded from upd;

  -- 5. nap: automatikus lezárás (a trigger értesíti a jelöltet és a céget)
  update public.applications
  set status = 'auto_closed', closed_reason = 'no_response', decided_at = now()
  where status = 'new' and response_due_at <= now();
  get diagnostics v_closed = row_count;

  return jsonb_build_object('reminded', v_reminded, 'auto_closed', v_closed);
end $$;
revoke execute on function public.process_no_ghosting() from public, anon, authenticated;

-- ───────────── utókövetés: felvétel után 30, 90, 180 nappal ─────────────
-- A válaszok külön táblában maradnak (followups) – később az illesztés tanítására.
alter table public.followups alter column token_hash drop not null;
alter table public.followups add column if not exists cancelled_at timestamptz;
alter table public.followups add column if not exists answered_by_email text;

create or replace function public.schedule_followups()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'hired' and old.status is distinct from 'hired' then
    insert into public.followups (application_id, day_offset, due_at)
    select new.id, d, now() + make_interval(days => d)
    from unnest(array[30, 90, 180]) d
    on conflict (application_id, day_offset) do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.schedule_followups() from public, anon, authenticated;

create trigger applications_followups
  after update of status on public.applications
  for each row execute function public.schedule_followups();

-- Esedékes utókövetések lefoglalása kiküldésre (a token-hash-t a szerver állítja be). Csak service role.
create or replace function public.claim_due_followups(p_limit integer default 50)
returns table (
  followup_id uuid, day_offset smallint, candidate_name text, job_title text, company_name text, recipient_emails text[]
)
language sql volatile security definer set search_path = public as $$
  with c as (
    select f.id from public.followups f
    join public.applications a on a.id = f.application_id
    where f.sent_at is null and f.cancelled_at is null and f.due_at <= now() and a.status = 'hired'
    order by f.due_at
    limit least(greatest(p_limit, 1), 200)
    for update of f skip locked
  ),
  upd as (
    update public.followups f set sent_at = now()
    from c where f.id = c.id
    returning f.id, f.day_offset, f.application_id
  )
  select upd.id, upd.day_offset, coalesce(nullif(p.full_name, ''), 'A jelölt'), j.title, co.name,
    array(select pr.email from public.company_members cm join public.profiles pr on pr.id = cm.user_id
          where cm.company_id = j.company_id and pr.email <> '')
  from upd
  join public.applications a on a.id = upd.application_id
  join public.jobs j on j.id = a.job_id
  join public.companies co on co.id = j.company_id
  left join public.profiles p on p.id = a.candidate_id
$$;
revoke execute on function public.claim_due_followups(integer) from public, anon, authenticated;

-- Egykattintásos kérdés (bejelentkezés nélkül, emailből): a link 60 napig él, egyszer tölthető ki
create or replace function public.followup_by_token(p_token_hash text)
returns table (status text, day_offset smallint, candidate_name text, job_title text, company_name text)
language sql stable security definer set search_path = public as $$
  select
    case when f.answered_at is not null then 'answered'
         when f.cancelled_at is not null or f.sent_at < now() - interval '60 days' then 'expired'
         else 'open' end,
    f.day_offset,
    case when f.answered_at is null then coalesce(nullif(p.full_name, ''), 'A jelölt') end,
    j.title, co.name
  from public.followups f
  join public.applications a on a.id = f.application_id
  join public.jobs j on j.id = a.job_id
  join public.companies co on co.id = j.company_id
  left join public.profiles p on p.id = a.candidate_id
  where p_token_hash is not null and f.token_hash = p_token_hash
$$;
revoke execute on function public.followup_by_token(text) from public;
grant execute on function public.followup_by_token(text) to anon, authenticated;

create or replace function public.submit_followup(
  p_token_hash text, p_still_employed boolean, p_reliable smallint, p_independent smallint, p_productive smallint
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_f public.followups%rowtype;
begin
  select * into v_f from public.followups where p_token_hash is not null and token_hash = p_token_hash for update;
  if not found or v_f.answered_at is not null or v_f.cancelled_at is not null or v_f.sent_at < now() - interval '60 days' then
    raise exception 'Ez a link már nem érvényes' using errcode = 'P0001';
  end if;
  if p_still_employed is null then
    raise exception 'Jelöld, hogy még nálatok dolgozik-e' using errcode = 'P0001';
  end if;
  if (p_reliable is not null and p_reliable not between 1 and 5)
     or (p_independent is not null and p_independent not between 1 and 5)
     or (p_productive is not null and p_productive not between 1 and 5) then
    raise exception 'A pontszám 1 és 5 között lehet' using errcode = 'P0001';
  end if;
  update public.followups
  set answered_at = now(), still_employed = p_still_employed,
      reliable = p_reliable, independent = p_independent, productive = p_productive
  where id = v_f.id;
  -- ha már nem dolgozik ott, a későbbi kérdések elmaradnak
  if not p_still_employed then
    update public.followups set cancelled_at = now()
    where application_id = v_f.application_id and sent_at is null and cancelled_at is null;
  end if;
  return true;
end $$;
revoke execute on function public.submit_followup(text, boolean, smallint, smallint, smallint) from public;
grant execute on function public.submit_followup(text, boolean, smallint, smallint, smallint) to anon, authenticated;

-- ───────────── ütemezett feladatok egy helyen ─────────────
create or replace function public.run_scheduled_jobs()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  v_result := public.process_no_ghosting();
  v_result := v_result || jsonb_build_object(
    'expired_jobs', public.expire_jobs(),
    'expired_reference_requests', public.expire_reference_requests()
  );
  return v_result;
end $$;
revoke execute on function public.run_scheduled_jobs() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.process_no_ghosting() to service_role;
    grant execute on function public.claim_due_followups(integer) to service_role;
    grant execute on function public.run_scheduled_jobs() to service_role;
  end if;
end $$;

-- ───────────── admin ─────────────
-- Szerepkör módosítása csak adminnak, saját magát nem fokozhatja le (az első admint SQL-ből kell kinevezni).
create or replace function public.admin_set_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Csak admin módosíthat szerepkört' using errcode = '42501';
  end if;
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'Saját admin jogodat nem veheted el' using errcode = 'P0001';
  end if;
  update public.profiles set role = p_role where id = p_user;
  if p_role = 'candidate' then
    insert into public.candidate_profiles (user_id) values (p_user) on conflict do nothing;
  end if;
end $$;
revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;

-- Moderálás: az admin törölheti a nem megfelelő médiát és albumot (a fájlokat is)
create policy media_items_admin_delete on public.media_items for delete to authenticated using (public.is_admin());
create policy albums_admin_delete on public.albums for delete to authenticated using (public.is_admin());
create policy "admin files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('candidate-media', 'intro-videos', 'venue-photos', 'company-logos') and public.is_admin());

-- Admin statisztika a vezérlőpulthoz
create or replace function public.admin_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not public.is_admin() then null else jsonb_build_object(
    'candidates', (select count(*) from public.profiles where role = 'candidate'),
    'employers', (select count(*) from public.profiles where role = 'employer'),
    'companies', (select count(*) from public.companies),
    'active_jobs', (select count(*) from public.jobs where status = 'active' and expires_at > now()),
    'applications', (select count(*) from public.applications),
    'applications_new', (select count(*) from public.applications where status = 'new'),
    'auto_closed', (select count(*) from public.applications where status = 'auto_closed'),
    'hired', (select count(*) from public.applications where status = 'hired'),
    'references', (select count(*) from public."references"),
    'trials_completed', (select count(*) from public.trial_shifts where status = 'completed'),
    'followups_answered', (select count(*) from public.followups where answered_at is not null),
    'followups_sent', (select count(*) from public.followups where sent_at is not null),
    'emails_pending', (select count(*) from public.notifications where emailed_at is null and email_attempts < 3)
  ) end
$$;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- ───────────── pg_cron: óránként az adatbázisban (ha elérhető) ─────────────
-- Az emailek kiküldése a Vercel oldalon történik (azonnal a műveletek után + napi cron).
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'joblantis-hourly';
    perform cron.schedule('joblantis-hourly', '7 * * * *', 'select public.run_scheduled_jobs()');
  end if;
end $$;
