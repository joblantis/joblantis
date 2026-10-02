-- JOBLANTIS – 3. fázis: illesztés és rangsor, jelentkezés, jelöltkártyák, pipeline, chat, értesítések

-- ───────────── munkakörönkénti munkastílus-célprofil (kiegészítő, max. 20% súly) ─────────────
create table public.template_work_styles (
  template_id integer not null references public.job_role_templates (id) on delete cascade,
  dimension_id integer not null references public.work_style_dimensions (id) on delete cascade,
  target smallint not null check (target between 0 and 100),
  primary key (template_id, dimension_id)
);
alter table public.template_work_styles enable row level security;
create policy template_work_styles_read on public.template_work_styles for select to anon, authenticated using (true);
create policy template_work_styles_admin on public.template_work_styles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke insert, update, delete on public.template_work_styles from anon;

-- ───────────── értesítések (alkalmazáson belül + email kimenő sor) ─────────────
create type public.notification_kind as enum ('application_new', 'application_status', 'application_rejected', 'message');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  application_id uuid references public.applications (id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  emailed_at timestamptz,
  email_attempts smallint not null default 0
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_email_queue_idx on public.notifications (created_at) where emailed_at is null;

alter table public.notifications enable row level security;
create policy notifications_own_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

-- ───────────── a jelölt a megpályázott állást lejárta után is látja ─────────────
create or replace function public.has_applied_to_job(p_job_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.applications where job_id = p_job_id and candidate_id = auth.uid())
$$;

create or replace function public.has_applied_to_company(p_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a join public.jobs j on j.id = a.job_id
    where j.company_id = p_company_id and a.candidate_id = auth.uid()
  )
$$;

create or replace function public.has_applied_to_venue(p_venue_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a join public.jobs j on j.id = a.job_id
    where j.venue_id = p_venue_id and a.candidate_id = auth.uid()
  )
$$;

create policy jobs_select_applicant on public.jobs for select to authenticated using (public.has_applied_to_job(id));
create policy companies_select_applicant on public.companies for select to authenticated using (public.has_applied_to_company(id));
create policy venues_select_applicant on public.venues for select to authenticated using (public.has_applied_to_venue(id));
create policy job_requirements_select_applicant on public.job_requirements for select to authenticated
  using (public.has_applied_to_job(job_id));

-- ───────────── illesztési pontszám indoklással ─────────────
-- Súlyok (összesen 100): kötelező kompetenciák 45, előnyt jelentők 15, műszak 15, távolság 10, munkastílus 15 (≤ 20%).
-- Kompetencia-kredit: hiányzik 0, bemondott 1, igazolt 1,5; a minimum szint alatt fele. Normálás az igazolt maximumra.
-- security invoker: a hívó jogaival fut, így a jelölt a saját adatait, a munkáltató csak a hozzá jelentkezőkét látja.
create or replace function public.match_details(p_candidate uuid, p_job uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  with job as (
    select j.id, j.template_id, j.shifts, s.lat, s.lng
    from public.jobs j
    join public.venues v on v.id = j.venue_id
    join public.settlements s on s.id = v.settlement_id
    where j.id = p_job
  ),
  cand as (
    select cp.availability, cp.travel_km, s.lat, s.lng
    from public.candidate_profiles cp
    left join public.settlements s on s.id = cp.settlement_id
    where cp.user_id = p_candidate
  ),
  req as (
    select r.kind, r.min_level, c.id, c.name, sk.level, sk.status, sk.verification_type,
      case when sk.level is null then 0::numeric
           else (case when sk.status = 'verified' then 1.5 else 1.0 end)
              * (case when sk.level >= r.min_level then 1.0 else 0.5 end)
      end as credit
    from public.job_requirements r
    join public.competencies c on c.id = r.competency_id
    left join public.candidate_skills sk on sk.competency_id = r.competency_id and sk.candidate_id = p_candidate
    where r.job_id = p_job
  ),
  ws as (
    select count(*) as n, avg(abs(w.score - t.target)) as diff
    from job
    join public.template_work_styles t on t.template_id = job.template_id
    join public.work_style_profiles w on w.dimension_id = t.dimension_id and w.candidate_id = p_candidate
  ),
  facts as (
    select
      coalesce((select sum(credit) / (1.5 * count(*)) from req where kind = 'required' having count(*) > 0), 1) as c_req,
      coalesce((select sum(credit) / (1.5 * count(*)) from req where kind = 'preferred' having count(*) > 0), 1) as c_pref,
      (select count(*) from req where kind = 'required') as req_total,
      (select count(*) from req where kind = 'required' and level is not null) as req_met,
      (select count(*) from req where kind = 'required' and status = 'verified') as req_verified,
      case when cardinality(job.shifts) = 0 then 1.0
           else (select count(*) from unnest(job.shifts) x where x = any (cand.availability))::numeric / cardinality(job.shifts)
      end as c_shift,
      array(select x from unnest(job.shifts) x where x = any (cand.availability)) as shifts_matched,
      job.shifts as shifts_job,
      case when cand.lat is null or job.lat is null then null
           else public.distance_km(cand.lat, cand.lng, job.lat, job.lng) end as dist,
      cand.travel_km,
      ws.n as ws_n,
      ws.diff as ws_diff
    from job cross join cand cross join ws
  ),
  scored as (
    select f.*,
      case
        when f.dist is null then 0.5
        when f.dist <= greatest(coalesce(f.travel_km, 20), 1) then 1 - 0.3 * f.dist / greatest(coalesce(f.travel_km, 20), 1)
        else greatest(0, 0.7 * (1 - (f.dist - greatest(coalesce(f.travel_km, 20), 1)) / greatest(coalesce(f.travel_km, 20), 1)))
      end::numeric as c_dist,
      case when f.ws_n = 0 then 0.5 else 1 - f.ws_diff / 100 end::numeric as c_ws
    from facts f
  )
  select jsonb_build_object(
    'score', round(45 * c_req + 15 * c_pref + 15 * c_shift + 10 * c_dist + 15 * c_ws, 1),
    'missing_required', req_total - req_met,
    'required_total', req_total,
    'required_met', req_met,
    'required_verified', req_verified,
    'components', jsonb_build_object(
      'required', round(c_req, 3), 'preferred', round(c_pref, 3), 'shifts', round(c_shift, 3),
      'distance', round(c_dist, 3), 'work_style', round(c_ws, 3)
    ),
    'weights', jsonb_build_object('required', 45, 'preferred', 15, 'shifts', 15, 'distance', 10, 'work_style', 15),
    'competencies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'kind', r.kind, 'min_level', r.min_level, 'level', r.level,
        'status', r.status, 'verification_type', r.verification_type
      ) order by r.kind, r.level is null, r.name)
      from req r
    ), '[]'::jsonb),
    'shifts_job', to_jsonb(shifts_job),
    'shifts_matched', to_jsonb(shifts_matched),
    'distance_km', round(dist::numeric, 1),
    'travel_km', travel_km,
    'work_style_known', ws_n > 0
  )
  from scored
$$;
grant execute on function public.match_details(uuid, uuid) to authenticated;
revoke execute on function public.match_details(uuid, uuid) from anon;

-- ───────────── jelölt: húzogatós álláslista illeszkedés szerint ─────────────
-- Alapból a keresett munkakörök és az utazási hajlandóság kétszerese; a hiányzó kötelező kompetencia hátrébb sorol, de nem rejt el.
create or replace function public.candidate_job_feed(
  p_template_id integer default null,
  p_max_km double precision default null,
  p_limit integer default 30
)
returns table (job_id uuid, score numeric, missing_required integer, distance_km double precision, details jsonb)
language sql stable security invoker set search_path = public as $$
  with me as (
    select cp.user_id, cp.travel_km, s.lat, s.lng
    from public.candidate_profiles cp
    left join public.settlements s on s.id = cp.settlement_id
    where cp.user_id = auth.uid()
  ),
  pool as (
    select j.id
    from public.jobs j
    join public.venues v on v.id = j.venue_id
    join public.settlements s on s.id = v.settlement_id
    cross join me
    where j.status = 'active' and j.expires_at > now()
      and not exists (select 1 from public.job_swipes w where w.job_id = j.id and w.candidate_id = me.user_id)
      and not exists (select 1 from public.applications a where a.job_id = j.id and a.candidate_id = me.user_id)
      and (
        case when p_template_id is not null then j.template_id = p_template_id
             else not exists (select 1 from public.candidate_target_roles r where r.candidate_id = me.user_id)
               or j.template_id in (select r.template_id from public.candidate_target_roles r where r.candidate_id = me.user_id)
        end
      )
      and (
        me.lat is null
        or public.distance_km(me.lat, me.lng, s.lat, s.lng)
           <= coalesce(p_max_km, greatest(coalesce(me.travel_km, 20), 5) * 2)
      )
  )
  select p.id, (d ->> 'score')::numeric, (d ->> 'missing_required')::int, (d ->> 'distance_km')::double precision, d
  from pool p
  cross join lateral (select public.match_details(auth.uid(), p.id) as d) m
  order by (d ->> 'missing_required')::int > 0, (d ->> 'score')::numeric desc, p.id
  limit least(greatest(p_limit, 1), 100)
$$;
grant execute on function public.candidate_job_feed(integer, double precision, integer) to authenticated;
revoke execute on function public.candidate_job_feed(integer, double precision, integer) from anon;

-- Illeszkedés több állásra (a lista nézet jelvényeihez)
create or replace function public.candidate_job_matches(p_job_ids uuid[])
returns table (job_id uuid, score numeric, missing_required integer, required_total integer)
language sql stable security invoker set search_path = public as $$
  select j, (d ->> 'score')::numeric, (d ->> 'missing_required')::int, (d ->> 'required_total')::int
  from unnest(p_job_ids[1:100]) j
  cross join lateral (select public.match_details(auth.uid(), j) as d) m
  where d is not null
$$;
grant execute on function public.candidate_job_matches(uuid[]) to authenticated;
revoke execute on function public.candidate_job_matches(uuid[]) from anon;

-- ───────────── jelentkezés: csak kész profillal, aktív állásra, pontszám-pillanatképpel ─────────────
create or replace function public.apply_to_job(p_job_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_details jsonb;
  v_id uuid;
begin
  if v_uid is null or public.app_role() is distinct from 'candidate' then
    raise exception 'Jelentkezni jelölti fiókkal lehet' using errcode = '42501';
  end if;
  if not exists (select 1 from public.candidate_profiles where user_id = v_uid and onboarding_step = 'done') then
    raise exception 'Jelentkezés előtt fejezd be a profilodat' using errcode = 'P0001';
  end if;
  select id into v_id from public.applications where job_id = p_job_id and candidate_id = v_uid;
  if v_id is not null then
    return v_id;
  end if;
  if not public.is_job_public(p_job_id) then
    raise exception 'Ez az állás már nem aktív' using errcode = 'P0001';
  end if;
  v_details := public.match_details(v_uid, p_job_id);
  insert into public.applications (job_id, candidate_id, match_score, match_breakdown)
  values (p_job_id, v_uid, (v_details ->> 'score')::numeric, v_details)
  on conflict (job_id, candidate_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.applications where job_id = p_job_id and candidate_id = v_uid;
  end if;
  insert into public.job_swipes (candidate_id, job_id, direction) values (v_uid, p_job_id, 'right')
  on conflict (candidate_id, job_id) do update set direction = 'right', created_at = now();
  return v_id;
end $$;
revoke execute on function public.apply_to_job(uuid) from public, anon;
grant execute on function public.apply_to_job(uuid) to authenticated;

-- ───────────── munkáltató: jelentkezők élő pontszámmal ─────────────
create or replace function public.job_applicants(p_job_id uuid)
returns table (
  application_id uuid, candidate_id uuid, status public.application_status, created_at timestamptz,
  response_due_at timestamptz, score numeric, missing_required integer, details jsonb
)
language sql stable security invoker set search_path = public as $$
  select a.id, a.candidate_id, a.status, a.created_at, a.response_due_at,
    coalesce((d ->> 'score')::numeric, a.match_score),
    coalesce((d ->> 'missing_required')::int, 0),
    coalesce(d, a.match_breakdown)
  from public.applications a
  join public.jobs j on j.id = a.job_id
  cross join lateral (select public.match_details(a.candidate_id, a.job_id) as d) m
  where a.job_id = p_job_id and (public.is_company_member(j.company_id) or public.is_admin())
  order by coalesce((d ->> 'missing_required')::int, 0) > 0, coalesce((d ->> 'score')::numeric, a.match_score) desc nulls last, a.created_at
$$;
grant execute on function public.job_applicants(uuid) to authenticated;
revoke execute on function public.job_applicants(uuid) from anon;

-- Jóváhagyott, nem rejtett ajánlások száma jelöltenként – csak azokra, akiket a hívó láthat (referens adatai nélkül)
create or replace function public.candidate_reference_counts(p_candidate_ids uuid[])
returns table (candidate_id uuid, reference_count integer)
language sql stable security definer set search_path = public as $$
  select r.candidate_id, count(*)::int
  from public.reference_requests r
  join public."references" f on f.request_id = r.id
  where r.candidate_id = any (p_candidate_ids[1:200])
    and f.approved_at is not null and not f.hidden
    and (r.candidate_id = auth.uid() or public.employer_can_view_candidate(r.candidate_id) or public.is_admin())
  group by r.candidate_id
$$;
revoke execute on function public.candidate_reference_counts(uuid[]) from public, anon;
grant execute on function public.candidate_reference_counts(uuid[]) to authenticated;

-- ───────────── beszélgetések listája (mindkét oldalnak, RLS szerint) ─────────────
create or replace function public.my_conversations()
returns table (
  application_id uuid, status public.application_status, job_title text, company_name text,
  candidate_id uuid, candidate_name text, last_body text, last_at timestamptz, last_sender uuid, unread integer
)
language sql stable security invoker set search_path = public as $$
  select a.id, a.status, j.title, c.name, a.candidate_id, p.full_name,
    lm.body, lm.created_at, lm.sender_id,
    (select count(*)::int from public.messages m where m.application_id = a.id and m.sender_id <> auth.uid() and m.read_at is null)
  from public.applications a
  join public.jobs j on j.id = a.job_id
  join public.companies c on c.id = j.company_id
  left join public.profiles p on p.id = a.candidate_id
  left join lateral (
    select m.body, m.created_at, m.sender_id from public.messages m
    where m.application_id = a.id order by m.created_at desc limit 1
  ) lm on true
  where public.is_application_participant(a.id)
    and (a.status in ('viewed', 'trial', 'offer', 'hired') or lm.created_at is not null)
  order by coalesce(lm.created_at, a.updated_at) desc
  limit 200
$$;
grant execute on function public.my_conversations() to authenticated;
revoke execute on function public.my_conversations() from anon;

create or replace function public.unread_message_count()
returns integer language sql stable security invoker set search_path = public as $$
  select count(*)::int from public.messages m
  where m.sender_id <> auth.uid() and m.read_at is null and public.is_application_participant(m.application_id)
$$;
grant execute on function public.unread_message_count() to authenticated;
revoke execute on function public.unread_message_count() from anon;

-- ───────────── értesítések triggerekből ─────────────
create or replace function public.notify_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_job record;
  v_name text;
begin
  select j.title, c.name as company_name, j.company_id into v_job
  from public.jobs j join public.companies c on c.id = j.company_id where j.id = new.job_id;

  if tg_op = 'INSERT' then
    select coalesce(nullif(full_name, ''), 'Új jelölt') into v_name from public.profiles where id = new.candidate_id;
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

  if new.status in ('rejected', 'auto_closed') then
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    values (new.candidate_id, 'application_rejected', new.id,
      'Válasz a jelentkezésedre: ' || v_job.title,
      'Köszönjük, hogy jelentkeztél a(z) ' || v_job.company_name || ' „' || v_job.title || '” állására. '
        || 'Ezúttal más jelölttel haladnak tovább, de a profilod alapján sok más hely várhat rád. Sok sikert a keresésben!',
      '/jelolt/jelentkezesek');
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

create trigger applications_notify
  after insert or update of status on public.applications
  for each row execute function public.notify_application();

create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_app record;
  v_sender text;
begin
  select a.id, a.candidate_id, j.company_id, j.title, c.name as company_name into v_app
  from public.applications a join public.jobs j on j.id = a.job_id join public.companies c on c.id = j.company_id
  where a.id = new.application_id;

  if new.sender_id = v_app.candidate_id then
    select coalesce(nullif(full_name, ''), 'A jelölt') into v_sender from public.profiles where id = new.sender_id;
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    select cm.user_id, 'message', v_app.id, 'Új üzenet: ' || v_sender, left(new.body, 280), '/uzenetek/' || v_app.id
    from public.company_members cm
    where cm.company_id = v_app.company_id
      and not exists (
        select 1 from public.notifications n
        where n.user_id = cm.user_id and n.application_id = v_app.id and n.kind = 'message' and n.read_at is null
      );
  else
    insert into public.notifications (user_id, kind, application_id, title, body, link)
    select v_app.candidate_id, 'message', v_app.id, 'Új üzenet: ' || v_app.company_name, left(new.body, 280), '/uzenetek/' || v_app.id
    where not exists (
      select 1 from public.notifications n
      where n.user_id = v_app.candidate_id and n.application_id = v_app.id and n.kind = 'message' and n.read_at is null
    );
  end if;
  return new;
end $$;

create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_message();

revoke execute on function public.notify_application() from public, anon, authenticated;
revoke execute on function public.notify_message() from public, anon, authenticated;

-- Email-kézbesítés: a kiküldendő értesítések lefoglalása (párhuzamos futásnál sem megy ki kétszer).
-- Az olvasott chat-értesítés már nem megy ki emailben. Csak a szerver (service role) hívhatja.
create or replace function public.claim_notification_emails(p_limit integer default 50)
returns table (id uuid, email text, full_name text, title text, body text, link text)
language sql volatile security definer set search_path = public as $$
  with c as (
    select n.id from public.notifications n
    where n.emailed_at is null and n.email_attempts < 3
      and n.created_at > now() - interval '3 days'
      and (n.kind <> 'message' or n.read_at is null)
    order by n.created_at
    limit least(greatest(p_limit, 1), 200)
    for update skip locked
  )
  update public.notifications n
  set email_attempts = n.email_attempts + 1, emailed_at = now()
  from c, public.profiles p
  where n.id = c.id and p.id = n.user_id
  returning n.id, p.email, p.full_name, n.title, n.body, n.link
$$;
revoke execute on function public.claim_notification_emails(integer) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.claim_notification_emails(integer) to service_role;
  end if;
end $$;

-- ───────────── Realtime: chat üzenetek és olvasottság (RLS szerint szűrve) ─────────────
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
