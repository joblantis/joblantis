-- JOBLANTIS – 4. fázis: ajánláskérés és referensi űrlap, próbanap-ütemezés és értékelés, igazolt státuszok

alter type public.notification_kind add value if not exists 'reference';
alter type public.notification_kind add value if not exists 'trial';

-- Az emlékeztető új linket kap; a régi link is érvényes marad (mindkettőnek csak a hash-ét tároljuk)
alter table public.reference_requests add column if not exists reminder_token_hash text unique;

-- ───────────── ajánláskérés (a jelölt) ─────────────
-- A szerver generálja a tokent és emailben küldi; ide csak a hash-e kerül.
create or replace function public.create_reference_request(
  p_company_name text, p_referee_name text, p_referee_email text, p_position text,
  p_period_from date, p_period_to date, p_token_hash text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or public.app_role() is distinct from 'candidate' then
    raise exception 'Ajánlást jelölti fiókkal lehet kérni' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_company_name, ''))) not between 2 and 120
     or char_length(trim(coalesce(p_referee_name, ''))) not between 2 and 120
     or char_length(trim(coalesce(p_position, ''))) not between 2 and 120 then
    raise exception 'Hiányzó vagy túl hosszú adat' using errcode = 'P0001';
  end if;
  if p_referee_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_referee_email) > 200 then
    raise exception 'Érvénytelen email cím' using errcode = 'P0001';
  end if;
  if p_period_from is null or p_period_from > current_date or (p_period_to is not null and p_period_to < p_period_from) then
    raise exception 'Érvénytelen időszak' using errcode = 'P0001';
  end if;
  if coalesce(char_length(p_token_hash), 0) <> 64 then
    raise exception 'Érvénytelen token' using errcode = 'P0001';
  end if;
  if (select count(*) from public.reference_requests where candidate_id = v_uid and status in ('pending', 'reminded')) >= 5 then
    raise exception 'Egyszerre legfeljebb 5 nyitott ajánláskérésed lehet' using errcode = 'P0001';
  end if;
  if (select count(*) from public.reference_requests where candidate_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Mára elérted az ajánláskérések számát, próbáld holnap' using errcode = 'P0001';
  end if;
  insert into public.reference_requests (candidate_id, company_name, referee_name, referee_email, position, period_from, period_to,
    token_hash, status, sent_at, reminder_at)
  values (v_uid, trim(p_company_name), trim(p_referee_name), lower(trim(p_referee_email)), trim(p_position), p_period_from, p_period_to,
    p_token_hash, 'pending', now(), now() + interval '7 days')
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.create_reference_request(text, text, text, text, date, date, text) from public, anon;
grant execute on function public.create_reference_request(text, text, text, text, date, date, text) to authenticated;

-- ───────────── referensi űrlap (regisztráció nélkül, token alapján) ─────────────
-- A link 30 napig él. Kitöltött vagy lejárt kérésnél csak az állapotot adjuk vissza, személyes adatot nem.
create or replace function public.reference_request_by_token(p_token_hash text)
returns table (
  request_id uuid, status text, candidate_name text, company_name text, job_position text,
  period_from date, period_to date, referee_name text, competencies jsonb
)
language sql stable security definer set search_path = public as $$
  with r as (
    select * from public.reference_requests
    where p_token_hash is not null and (token_hash = p_token_hash or reminder_token_hash = p_token_hash)
  )
  select r.id,
    case when r.status = 'completed' then 'completed'
         when r.status = 'expired' or r.created_at < now() - interval '30 days' then 'expired'
         else 'open' end,
    case when r.status in ('pending', 'reminded') and r.created_at >= now() - interval '30 days' then p.full_name end,
    r.company_name, r.position, r.period_from, r.period_to, r.referee_name,
    case when r.status in ('pending', 'reminded') and r.created_at >= now() - interval '30 days' then coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'category', c.category) order by c.category, c.name)
      from public.competencies c
      where c.id in (
        select s.competency_id from public.candidate_skills s where s.candidate_id = r.candidate_id
        union
        select tc.competency_id from public.template_competencies tc
        join public.candidate_target_roles t on t.template_id = tc.template_id where t.candidate_id = r.candidate_id
      )
    ), '[]'::jsonb) else '[]'::jsonb end
  from r join public.profiles p on p.id = r.candidate_id
$$;
revoke execute on function public.reference_request_by_token(text) from public;
grant execute on function public.reference_request_by_token(text) to anon, authenticated;

create or replace function public.submit_reference(
  p_token_hash text, p_employment_confirmed boolean, p_competency_ids integer[], p_recommendation text, p_would_rehire boolean
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_req public.reference_requests%rowtype;
  v_ref uuid;
  v_text text := nullif(trim(coalesce(p_recommendation, '')), '');
begin
  select * into v_req from public.reference_requests
  where p_token_hash is not null and (token_hash = p_token_hash or reminder_token_hash = p_token_hash)
  for update;
  if not found or v_req.status not in ('pending', 'reminded') or v_req.created_at < now() - interval '30 days' then
    raise exception 'Ez a link már nem érvényes' using errcode = 'P0001';
  end if;
  if p_employment_confirmed is null then
    raise exception 'Jelöld, hogy a munkaviszony fennállt-e' using errcode = 'P0001';
  end if;
  if v_text is not null and char_length(v_text) > 600 then
    raise exception 'Az ajánlás legfeljebb 600 karakter lehet' using errcode = 'P0001';
  end if;

  insert into public."references" (request_id, employment_confirmed, recommendation, would_rehire)
  values (v_req.id, p_employment_confirmed, v_text, p_would_rehire)
  returning id into v_ref;

  -- csak a jelölthöz releváns kompetenciák igazolhatók, és csak visszaigazolt munkaviszonynál
  if p_employment_confirmed then
    insert into public.reference_competencies (reference_id, competency_id)
    select distinct v_ref, c from unnest(coalesce(p_competency_ids, '{}')) c
    where c in (
      select s.competency_id from public.candidate_skills s where s.candidate_id = v_req.candidate_id
      union
      select tc.competency_id from public.template_competencies tc
      join public.candidate_target_roles t on t.template_id = tc.template_id where t.candidate_id = v_req.candidate_id
    );
  end if;

  update public.reference_requests set status = 'completed' where id = v_req.id;

  insert into public.notifications (user_id, kind, title, body, link)
  values (v_req.candidate_id, 'reference',
    'Megérkezett az ajánlásod: ' || v_req.referee_name,
    v_req.referee_name || ' (' || v_req.company_name || ') kitöltötte az ajánlást. Nézd meg és hagyd jóvá, hogy megjelenjen a profilodon.',
    '/jelolt/ajanlasok');
  return true;
end $$;
revoke execute on function public.submit_reference(text, boolean, integer[], text, boolean) from public;
grant execute on function public.submit_reference(text, boolean, integer[], text, boolean) to anon, authenticated;

-- ───────────── igazolt (referencia) státusz szinkronizálása ─────────────
-- Jóváhagyott, nem rejtett, munkaviszonyt visszaigazoló ajánlás kompetenciái "igazolt (referencia)" státuszt kapnak.
-- Elrejtés vagy visszavonás esetén a csak referenciával igazolt készség visszaáll bemondottra – vagy törlődik,
-- ha a jelölt maga sosem jelölte (így az elrejtés nem hagy maga után önbevallást). A próbanapos igazolás érintetlen.
create or replace function public.sync_reference_skills(p_candidate uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  with backed as (
    select distinct rc.competency_id
    from public.reference_competencies rc
    join public."references" f on f.id = rc.reference_id
    join public.reference_requests r on r.id = f.request_id
    where r.candidate_id = p_candidate and f.approved_at is not null and not f.hidden and f.employment_confirmed
  ),
  claimed_by_cards as (
    select distinct sc.competency_id
    from public.candidate_swipe_answers a join public.swipe_cards sc on sc.id = a.card_id
    where a.candidate_id = p_candidate and a.direction in ('right', 'up') and sc.competency_id is not null
  ),
  stale as (
    select s.competency_id, s.competency_id in (select competency_id from claimed_by_cards) as keep
    from public.candidate_skills s
    where s.candidate_id = p_candidate and s.verification_type = 'reference'
      and s.competency_id not in (select competency_id from backed)
  ),
  del as (
    delete from public.candidate_skills s using stale
    where s.candidate_id = p_candidate and s.competency_id = stale.competency_id and not stale.keep
    returning 1
  )
  update public.candidate_skills s set status = 'claimed', verification_type = null, verified_at = null
  from stale
  where s.candidate_id = p_candidate and s.competency_id = stale.competency_id and stale.keep;

  insert into public.candidate_skills (candidate_id, competency_id, level, status, verification_type, verified_at)
  select p_candidate, b.competency_id, 3, 'verified', 'reference', now()
  from (
    select distinct rc.competency_id
    from public.reference_competencies rc
    join public."references" f on f.id = rc.reference_id
    join public.reference_requests r on r.id = f.request_id
    where r.candidate_id = p_candidate and f.approved_at is not null and not f.hidden and f.employment_confirmed
  ) b
  on conflict (candidate_id, competency_id) do update
    set status = 'verified', verification_type = 'reference', verified_at = now()
    where public.candidate_skills.status = 'claimed';
end $$;
revoke execute on function public.sync_reference_skills(uuid) from public, anon, authenticated;

-- A jóváhagyás nem vonható vissza (csak elrejthető); a szinkron a módosítás után fut.
create or replace function public.guard_reference_review()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.approved_at is not null and new.approved_at is null then
    new.approved_at := old.approved_at;
  end if;
  return new;
end $$;
revoke execute on function public.guard_reference_review() from public, anon, authenticated;

create or replace function public.after_reference_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.approved_at is distinct from old.approved_at or new.hidden is distinct from old.hidden then
    perform public.sync_reference_skills((select candidate_id from public.reference_requests where id = new.request_id));
  end if;
  return null;
end $$;
revoke execute on function public.after_reference_review() from public, anon, authenticated;

create trigger references_guard before update on public."references"
  for each row execute function public.guard_reference_review();
create trigger references_sync after update of approved_at, hidden on public."references"
  for each row execute function public.after_reference_review();

-- Ajánlások megjelenítése: a jelölt mindet látja, a munkáltató csak a jóváhagyott, nem rejtetteket
-- (a referens email címe soha nem kerül ki).
create or replace function public.candidate_references(p_candidate uuid)
returns table (
  reference_id uuid, referee_name text, company_name text, job_position text, period_from date, period_to date,
  employment_confirmed boolean, recommendation text, would_rehire boolean, submitted_at timestamptz,
  approved_at timestamptz, hidden boolean, competencies text[]
)
language sql stable security definer set search_path = public as $$
  select f.id, r.referee_name, r.company_name, r.position, r.period_from, r.period_to,
    f.employment_confirmed, f.recommendation, f.would_rehire, f.submitted_at, f.approved_at, f.hidden,
    array(select c.name from public.reference_competencies rc join public.competencies c on c.id = rc.competency_id
          where rc.reference_id = f.id order by c.name)
  from public."references" f
  join public.reference_requests r on r.id = f.request_id
  where r.candidate_id = p_candidate
    and (
      r.candidate_id = auth.uid()
      or public.is_admin()
      or (f.approved_at is not null and not f.hidden and public.employer_can_view_candidate(r.candidate_id))
    )
  order by f.submitted_at desc
$$;
revoke execute on function public.candidate_references(uuid) from public, anon;
grant execute on function public.candidate_references(uuid) to authenticated;

-- Emlékeztető a 7 napja nem válaszoló referensnek (egyszer). Csak a szerver hívja; az új linket a szerver állítja be.
create or replace function public.claim_reference_reminders(p_limit integer default 50)
returns table (request_id uuid, referee_name text, referee_email text, candidate_name text, company_name text)
language sql volatile security definer set search_path = public as $$
  with c as (
    select r.id from public.reference_requests r
    where r.status = 'pending' and r.reminded_at is null and r.reminder_at <= now()
      and r.created_at > now() - interval '30 days'
    order by r.reminder_at
    limit least(greatest(p_limit, 1), 200)
    for update skip locked
  )
  update public.reference_requests r set status = 'reminded', reminded_at = now()
  from c, public.profiles p
  where r.id = c.id and p.id = r.candidate_id
  returning r.id, r.referee_name, r.referee_email, p.full_name, r.company_name
$$;
revoke execute on function public.claim_reference_reminders(integer) from public, anon, authenticated;

-- 30 napnál régebbi, kitöltetlen kérések lejártként jelölése (a cron hívja)
create or replace function public.expire_reference_requests()
returns integer language sql volatile security definer set search_path = public as $$
  with u as (
    update public.reference_requests set status = 'expired'
    where status in ('pending', 'reminded') and created_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::int from u
$$;
revoke execute on function public.expire_reference_requests() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.claim_reference_reminders(integer) to service_role;
    grant execute on function public.expire_reference_requests() to service_role;
  end if;
end $$;

-- ───────────── próbanap ─────────────
-- A munkáltató ajánl (RLS: trial_shifts_employer_write), a jelölt elfogadja vagy elutasítja.
alter table public.trial_shifts add constraint trial_shifts_note_len check (note is null or char_length(note) <= 500);

create or replace function public.respond_trial_shift(p_trial_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_trial record;
begin
  select t.id, t.status, t.starts_at, a.candidate_id into v_trial
  from public.trial_shifts t join public.applications a on a.id = t.application_id
  where t.id = p_trial_id
  for update of t;
  if not found or v_trial.candidate_id is distinct from auth.uid() then
    raise exception 'A próbanap nem található' using errcode = '42501';
  end if;
  if v_trial.status <> 'proposed' then
    raise exception 'Erre a próbanapra már válaszoltál' using errcode = 'P0001';
  end if;
  if v_trial.starts_at <= now() then
    raise exception 'Ez az időpont már elmúlt' using errcode = 'P0001';
  end if;
  update public.trial_shifts
  set status = case when p_accept then 'accepted'::public.trial_status else 'declined'::public.trial_status end,
      accepted_at = case when p_accept then now() end
  where id = p_trial_id;
end $$;
revoke execute on function public.respond_trial_shift(uuid, boolean) from public, anon;
grant execute on function public.respond_trial_shift(uuid, boolean) to authenticated;

create or replace function public.notify_trial_shift()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_app record;
  v_when text;
begin
  select a.id, a.candidate_id, j.company_id, j.title, c.name as company_name, p.full_name into v_app
  from public.applications a join public.jobs j on j.id = a.job_id join public.companies c on c.id = j.company_id
  left join public.profiles p on p.id = a.candidate_id
  where a.id = new.application_id;
  v_when := to_char(new.starts_at at time zone 'Europe/Budapest', 'YYYY.MM.DD. HH24:MI');

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    values (v_app.candidate_id, 'trial', v_app.id,
      'Próbanap-ajánlat: ' || v_app.title,
      'A(z) ' || v_app.company_name || ' próbanapot ajánl: ' || v_when || ', ' || new.duration_minutes / 60.0 || ' óra'
        || case when new.is_paid then ', díjazott.' else ', díjazás nélkül.' end || ' Fogadd el vagy jelezz vissza a chatben.',
      '/uzenetek/' || v_app.id);
  elsif new.status is distinct from old.status and new.status in ('accepted', 'declined') then
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    select cm.user_id, 'trial', v_app.id,
      coalesce(nullif(v_app.full_name, ''), 'A jelölt') || case when new.status = 'accepted' then ' elfogadta a próbanapot' else ' nem tud jönni a próbanapra' end,
      'Próbanap: ' || v_when || ' – ' || v_app.title || '.'
        || case when new.status = 'accepted' then ' A próbanap után értékeld a kompetenciákat.' else ' Ajánlj új időpontot a chatben.' end,
      '/munkaltato/jelentkezes/' || v_app.id
    from public.company_members cm where cm.company_id = v_app.company_id;
  elsif new.status is distinct from old.status and new.status = 'cancelled' then
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    values (v_app.candidate_id, 'trial', v_app.id,
      'Próbanap lemondva: ' || v_app.title,
      'A(z) ' || v_app.company_name || ' lemondta a(z) ' || v_when || ' időpontra szóló próbanapot.',
      '/uzenetek/' || v_app.id);
  end if;
  return new;
end $$;
revoke execute on function public.notify_trial_shift() from public, anon, authenticated;

create trigger trial_shifts_notify
  after insert or update of status on public.trial_shifts
  for each row execute function public.notify_trial_shift();

-- ───────────── próbanap értékelése és "igazolt (próbanap)" státusz ─────────────
-- Ugyanazokat a kompetenciákat pontozza 1–5-ig, amelyeket az állás megkövetel; a legalább 4-es pontot kapott
-- készségek automatikusan "igazolt (próbanap)" státuszt kapnak (a szint nem csökken).
create or replace function public.submit_trial_evaluation(p_trial_id uuid, p_scores jsonb, p_comment text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_trial record;
  v_eval uuid;
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
  v_verified int;
begin
  select t.id, t.status, t.starts_at, t.application_id, a.candidate_id, a.job_id into v_trial
  from public.trial_shifts t join public.applications a on a.id = t.application_id
  where t.id = p_trial_id
  for update of t;
  if not found or not public.is_application_employer(v_trial.application_id) then
    raise exception 'A próbanap nem található' using errcode = '42501';
  end if;
  if v_trial.status <> 'accepted' then
    raise exception 'Csak elfogadott, még nem értékelt próbanap értékelhető' using errcode = 'P0001';
  end if;
  if v_trial.starts_at > now() then
    raise exception 'A próbanap még nem kezdődött el' using errcode = 'P0001';
  end if;
  if v_comment is not null and char_length(v_comment) > 1000 then
    raise exception 'A megjegyzés legfeljebb 1000 karakter lehet' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_scores) <> 'object' then
    raise exception 'Érvénytelen pontozás' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.job_requirements r
    where r.job_id = v_trial.job_id and not (p_scores ? r.competency_id::text)
  ) then
    raise exception 'Minden kompetenciát pontozz 1–5-ig' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_each_text(p_scores) e
    where e.value !~ '^[1-5]$'
       or e.key !~ '^\d+$'
       or not exists (select 1 from public.job_requirements r where r.job_id = v_trial.job_id and r.competency_id = e.key::int)
  ) then
    raise exception 'Érvénytelen pontozás' using errcode = 'P0001';
  end if;

  insert into public.evaluations (trial_shift_id, evaluator_id, comment)
  values (p_trial_id, auth.uid(), v_comment)
  returning id into v_eval;
  insert into public.evaluation_items (evaluation_id, competency_id, score)
  select v_eval, e.key::int, e.value::smallint from jsonb_each_text(p_scores) e;

  update public.trial_shifts set status = 'completed' where id = p_trial_id;

  insert into public.candidate_skills (candidate_id, competency_id, level, status, verification_type, verified_at)
  select v_trial.candidate_id, e.key::int, e.value::smallint, 'verified', 'trial', now()
  from jsonb_each_text(p_scores) e
  where e.value::int >= 4
  on conflict (candidate_id, competency_id) do update
    set status = 'verified', verification_type = 'trial', verified_at = now(),
        level = greatest(public.candidate_skills.level, excluded.level);
  get diagnostics v_verified = row_count;

  insert into public.notifications (user_id, kind, application_id, title, body, link)
  values (v_trial.candidate_id, 'trial', v_trial.application_id,
    'Értékelték a próbanapodat',
    case when v_verified > 0
      then v_verified || ' kompetenciád „igazolt (próbanap)” státuszt kapott. Ez előrébb visz a rangsorban.'
      else 'A munkáltató értékelte a próbanapot. A részletekről a chatben tudsz egyeztetni.' end,
    '/jelolt');
  return v_eval;
end $$;
revoke execute on function public.submit_trial_evaluation(uuid, jsonb, text) from public, anon;
grant execute on function public.submit_trial_evaluation(uuid, jsonb, text) to authenticated;

-- Az értékelés csak a fenti függvénnyel jöhet létre (közvetlen insert nem, így nem kerülhető meg az igazolás logikája)
revoke insert, update, delete on public.evaluations, public.evaluation_items from authenticated, anon;
