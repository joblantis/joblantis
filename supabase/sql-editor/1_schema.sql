-- JOBLANTIS – 1/2: adatbázisséma (táblák, függvények, RLS, Storage).
-- Supabase → SQL Editor → New query → másold be az egészet → Run.
-- Újrafuttatható: az elején törli a JOBLANTIS korábbi objektumait és ADATAIT. Élesítés után ne futtasd!
-- Generálta: scripts/build-sql-editor.py

begin;

-- ----- Előzetes takarítás: a JOBLANTIS korábbi (akár félkész) objektumainak törlése -----
-- FIGYELEM: minden JOBLANTIS táblát és adatot töröl. Csak indulás előtt, üres projekten használd!
drop trigger if exists on_auth_user_created on auth.users;

do $$
declare
  p text;
begin
  foreach p in array array[
    'company files read','company files insert','company files update','company files delete',
    'candidate files read','candidate files insert','candidate files update','candidate files delete'
  ] loop
    execute format('drop policy if exists %I on storage.objects', p);
  end loop;
end $$;

drop table if exists
  public.followups, public.evaluation_items, public.evaluations, public.trial_shifts,
  public.reference_competencies, public."references", public.reference_requests,
  public.messages, public.application_events, public.applications, public.job_swipes,
  public.job_requirements, public.jobs,
  public.media_item_competencies, public.media_items, public.albums,
  public.work_style_profiles, public.candidate_skills, public.candidate_swipe_answers,
  public.candidate_target_roles, public.candidate_profiles,
  public.swipe_cards, public.work_style_dimensions, public.template_competencies,
  public.competencies, public.job_role_templates,
  public.venue_photos, public.venues, public.company_members, public.companies,
  public.settlements, public.profiles
  cascade;

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (array[
      'set_updated_at','try_uuid','distance_km','app_role','is_admin','is_company_member','is_company_owner',
      'is_job_public','venue_has_public_job','company_has_public_job','employer_can_view_candidate',
      'is_application_participant','is_application_employer','handle_new_user','create_company',
      'log_application_status','check_job_venue','expire_jobs','search_public_jobs','candidate_relevant_competencies'
    ])
  loop
    execute format('drop function if exists %s cascade', f);
  end loop;
end $$;

drop type if exists
  public.user_role, public.company_member_role, public.shift_type, public.requirement_kind,
  public.swipe_dir, public.card_kind, public.skill_status, public.verification_type,
  public.job_status, public.wage_period, public.application_status, public.media_kind,
  public.reference_request_status, public.trial_status
  cascade;

drop schema if exists joblantis_internal cascade;
-- ----- takarítás vége -----

-- ===== 0001_extensions_enums.sql =====
-- JOBLANTIS – bővítmények és felsorolt típusok

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.user_role as enum ('candidate', 'employer', 'admin');
create type public.company_member_role as enum ('owner', 'manager');
create type public.shift_type as enum ('reggel', 'delutan', 'este', 'ejszaka', 'hetvege');
create type public.requirement_kind as enum ('required', 'preferred');
create type public.swipe_dir as enum ('left', 'right', 'up');
create type public.card_kind as enum ('competency', 'work_style');
create type public.skill_status as enum ('claimed', 'verified');
create type public.verification_type as enum ('reference', 'trial', 'admin');
create type public.job_status as enum ('draft', 'active', 'expired', 'closed');
create type public.wage_period as enum ('hourly', 'monthly');
create type public.application_status as enum ('new', 'viewed', 'trial', 'offer', 'hired', 'rejected', 'auto_closed');
create type public.media_kind as enum ('image', 'video');
create type public.reference_request_status as enum ('pending', 'reminded', 'completed', 'expired');
create type public.trial_status as enum ('proposed', 'accepted', 'declined', 'completed', 'cancelled');

-- ===== 0002_core_tables.sql =====
-- JOBLANTIS – alap táblák: felhasználói profil, települések, cégek, helyszínek

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'candidate',
  full_name text not null default '',
  email text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Magyar települések irányítószámmal és koordinátával (forrás: GeoNames, CC BY 4.0)
create table public.settlements (
  id serial primary key,
  postal_code text not null,
  name text not null,
  county text,
  lat double precision not null,
  lng double precision not null,
  unique (postal_code, name)
);
create index settlements_postal_code_idx on public.settlements (postal_code);
create index settlements_name_trgm_idx on public.settlements using gin (name extensions.gin_trgm_ops);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  description text,
  website text,
  logo_path text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role public.company_member_role not null default 'manager',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index company_members_user_idx on public.company_members (user_id);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  address text,
  postal_code text not null,
  settlement_id integer not null references public.settlements (id),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index venues_company_idx on public.venues (company_id);

create table public.venue_photos (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index venue_photos_venue_idx on public.venue_photos (venue_id, sort_order);

-- ===== 0003_catalog.sql =====
-- JOBLANTIS – katalógus: munkakör-sablonok, kompetenciák, swipe kártyák, munkastílus-dimenziók

create table public.job_role_templates (
  id serial primary key,
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.competencies (
  id serial primary key,
  slug text not null unique,
  name text not null,
  description text,
  category text not null default 'szakmai',
  has_language_level boolean not null default false
);

create table public.template_competencies (
  template_id integer not null references public.job_role_templates (id) on delete cascade,
  competency_id integer not null references public.competencies (id) on delete cascade,
  default_requirement public.requirement_kind not null default 'preferred',
  sort_order integer not null default 0,
  primary key (template_id, competency_id)
);

create table public.work_style_dimensions (
  id serial primary key,
  slug text not null unique,
  name text not null,
  low_label text not null,
  high_label text not null,
  sort_order integer not null default 0
);

create table public.swipe_cards (
  id serial primary key,
  template_id integer references public.job_role_templates (id) on delete cascade,
  kind public.card_kind not null,
  statement text not null check (char_length(statement) between 5 and 200),
  competency_id integer references public.competencies (id) on delete cascade,
  dimension_id integer references public.work_style_dimensions (id) on delete cascade,
  -- +1: az "igen" a dimenzió magas pólusa felé visz, -1: fordított állítás
  polarity smallint not null default 1 check (polarity in (-1, 1)),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  constraint swipe_cards_target_chk check (
    (kind = 'competency' and competency_id is not null and dimension_id is null and template_id is not null)
    or (kind = 'work_style' and dimension_id is not null and competency_id is null)
  )
);
create index swipe_cards_template_idx on public.swipe_cards (template_id, sort_order);
create unique index swipe_cards_unique_statement on public.swipe_cards (coalesce(template_id, 0), statement);

-- ===== 0004_candidate.sql =====
-- JOBLANTIS – jelölt adatai: profil, swipe válaszok, készségek, munkastílus, galéria

create table public.candidate_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  headline text,
  bio text check (bio is null or char_length(bio) <= 1000),
  postal_code text,
  settlement_id integer references public.settlements (id),
  travel_km integer check (travel_km is null or travel_km between 0 and 300),
  wage_expectation integer check (wage_expectation is null or wage_expectation >= 0),
  wage_period public.wage_period not null default 'monthly',
  start_date date,
  availability public.shift_type[] not null default '{}',
  intro_video_path text,
  intro_video_poster_path text,
  onboarding_step text not null default 'roles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_target_roles (
  candidate_id uuid not null references public.candidate_profiles (user_id) on delete cascade,
  template_id integer not null references public.job_role_templates (id) on delete cascade,
  primary key (candidate_id, template_id)
);

create table public.candidate_swipe_answers (
  candidate_id uuid not null references public.candidate_profiles (user_id) on delete cascade,
  card_id integer not null references public.swipe_cards (id) on delete cascade,
  direction public.swipe_dir not null,
  answered_at timestamptz not null default now(),
  primary key (candidate_id, card_id)
);

create table public.candidate_skills (
  candidate_id uuid not null references public.candidate_profiles (user_id) on delete cascade,
  competency_id integer not null references public.competencies (id) on delete cascade,
  level smallint not null check (level between 1 and 5),
  status public.skill_status not null default 'claimed',
  verification_type public.verification_type,
  verified_at timestamptz,
  language_level text check (language_level is null or language_level in ('A1','A2','B1','B2','C1','C2')),
  updated_at timestamptz not null default now(),
  primary key (candidate_id, competency_id),
  constraint candidate_skills_verified_chk check (
    (status = 'claimed' and verification_type is null)
    or (status = 'verified' and verification_type is not null)
  )
);

create table public.work_style_profiles (
  candidate_id uuid not null references public.candidate_profiles (user_id) on delete cascade,
  dimension_id integer not null references public.work_style_dimensions (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (candidate_id, dimension_id)
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles (user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index albums_candidate_idx on public.albums (candidate_id, sort_order);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  candidate_id uuid not null references public.candidate_profiles (user_id) on delete cascade,
  kind public.media_kind not null,
  file_path text not null,
  thumb_path text,
  description text check (description is null or char_length(description) <= 300),
  duration_s numeric(5,1) check (duration_s is null or duration_s <= 60),
  size_bytes bigint check (size_bytes is null or size_bytes <= 104857600),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index media_items_album_idx on public.media_items (album_id, sort_order);

create table public.media_item_competencies (
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  competency_id integer not null references public.competencies (id) on delete cascade,
  primary key (media_item_id, competency_id)
);

-- ===== 0005_jobs_applications.sql =====
-- JOBLANTIS – állások, követelmények, swipe-ok, jelentkezések, chat

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete restrict,
  template_id integer not null references public.job_role_templates (id),
  slug text not null unique,
  title text not null check (char_length(title) between 3 and 120),
  description text check (description is null or char_length(description) <= 5000),
  wage_min integer check (wage_min is null or wage_min >= 0),
  wage_max integer check (wage_max is null or wage_max >= 0),
  wage_period public.wage_period not null default 'monthly',
  shifts public.shift_type[] not null default '{}',
  schedule_note text,
  start_date date,
  is_seasonal boolean not null default false,
  status public.job_status not null default 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_wage_range_chk check (wage_min is null or wage_max is null or wage_min <= wage_max),
  constraint jobs_active_chk check (status <> 'active' or (published_at is not null and expires_at is not null))
);
create index jobs_public_idx on public.jobs (status, expires_at desc);
create index jobs_company_idx on public.jobs (company_id);
create index jobs_venue_idx on public.jobs (venue_id);
create index jobs_template_idx on public.jobs (template_id);

create table public.job_requirements (
  job_id uuid not null references public.jobs (id) on delete cascade,
  competency_id integer not null references public.competencies (id) on delete cascade,
  kind public.requirement_kind not null,
  min_level smallint not null default 1 check (min_level between 1 and 5),
  primary key (job_id, competency_id)
);

create table public.job_swipes (
  candidate_id uuid not null references public.candidate_profiles (user_id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  direction public.swipe_dir not null,
  created_at timestamptz not null default now(),
  primary key (candidate_id, job_id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  candidate_id uuid not null references public.candidate_profiles (user_id) on delete cascade,
  status public.application_status not null default 'new',
  match_score numeric(5,2),
  match_breakdown jsonb,
  response_due_at timestamptz not null default (now() + interval '5 days'),
  reminder_sent_at timestamptz,
  decided_at timestamptz,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);
create index applications_candidate_idx on public.applications (candidate_id);
create index applications_due_idx on public.applications (status, response_due_at);

create table public.application_events (
  id bigserial primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index application_events_app_idx on public.application_events (application_id, created_at);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_app_idx on public.messages (application_id, created_at);

-- ===== 0006_references_trials.sql =====
-- JOBLANTIS – ajánlások, próbanapok, értékelések, utókövetés

create table public.reference_requests (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles (user_id) on delete cascade,
  company_name text not null,
  referee_name text not null,
  referee_email text not null,
  position text not null,
  period_from date not null,
  period_to date,
  -- csak a token hash-ét tároljuk; a nyers token az emailben megy ki
  token_hash text not null unique,
  status public.reference_request_status not null default 'pending',
  sent_at timestamptz,
  reminder_at timestamptz,
  reminded_at timestamptz,
  created_at timestamptz not null default now()
);
create index reference_requests_candidate_idx on public.reference_requests (candidate_id);

create table public."references" (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.reference_requests (id) on delete cascade,
  employment_confirmed boolean not null,
  recommendation text check (recommendation is null or char_length(recommendation) <= 600),
  would_rehire boolean,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  hidden boolean not null default false
);

create table public.reference_competencies (
  reference_id uuid not null references public."references" (id) on delete cascade,
  competency_id integer not null references public.competencies (id) on delete cascade,
  primary key (reference_id, competency_id)
);

create table public.trial_shifts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 30 and 720),
  is_paid boolean not null default false,
  note text,
  status public.trial_status not null default 'proposed',
  proposed_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index trial_shifts_app_idx on public.trial_shifts (application_id);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  trial_shift_id uuid not null unique references public.trial_shifts (id) on delete cascade,
  evaluator_id uuid references public.profiles (id) on delete set null,
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create table public.evaluation_items (
  evaluation_id uuid not null references public.evaluations (id) on delete cascade,
  competency_id integer not null references public.competencies (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  primary key (evaluation_id, competency_id)
);

-- Felvétel utáni 30/90/180 napos utókövetés – külön tárolva az illesztés későbbi tanításához
create table public.followups (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  day_offset smallint not null check (day_offset in (30, 90, 180)),
  due_at timestamptz not null,
  token_hash text not null unique,
  sent_at timestamptz,
  answered_at timestamptz,
  still_employed boolean,
  reliable smallint check (reliable between 1 and 5),
  independent smallint check (independent between 1 and 5),
  productive smallint check (productive between 1 and 5),
  unique (application_id, day_offset)
);
create index followups_due_idx on public.followups (due_at) where sent_at is null;

-- ===== 0007_functions.sql =====
-- JOBLANTIS – segédfüggvények, triggerek

-- updated_at automatikus frissítése
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger companies_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger venues_updated_at before update on public.venues for each row execute function public.set_updated_at();
create trigger candidate_profiles_updated_at before update on public.candidate_profiles for each row execute function public.set_updated_at();
create trigger candidate_skills_updated_at before update on public.candidate_skills for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
create trigger applications_updated_at before update on public.applications for each row execute function public.set_updated_at();

-- Biztonságos uuid-konverzió (storage útvonalakhoz)
create or replace function public.try_uuid(p text)
returns uuid language sql immutable as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end
$$;

-- Légvonalbeli távolság km-ben (haversine)
create or replace function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable parallel safe as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- Szerepkör-ellenőrzők (security definer: RLS-rekurzió nélkül futnak)
create or replace function public.app_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members where company_id = p_company_id and user_id = auth.uid())
$$;

create or replace function public.is_company_owner(p_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid() and member_role = 'owner'
  )
$$;

-- Nyilvános-e az állás (aktív és nem járt le)
create or replace function public.is_job_public(p_job_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jobs where id = p_job_id and status = 'active' and expires_at > now())
$$;

create or replace function public.venue_has_public_job(p_venue_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jobs where venue_id = p_venue_id and status = 'active' and expires_at > now())
$$;

create or replace function public.company_has_public_job(p_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jobs where company_id = p_company_id and status = 'active' and expires_at > now())
$$;

-- A munkáltató csak akkor látja a jelöltet, ha az jelentkezett a cége valamelyik állására
create or replace function public.employer_can_view_candidate(p_candidate_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.company_members cm on cm.company_id = j.company_id
    where a.candidate_id = p_candidate_id and cm.user_id = auth.uid()
  )
$$;

-- A jelentkezés résztvevője-e (jelölt vagy a cég tagja)
create or replace function public.is_application_participant(p_application_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = p_application_id
      and (a.candidate_id = auth.uid() or exists (
        select 1 from public.company_members cm where cm.company_id = j.company_id and cm.user_id = auth.uid()
      ))
  )
$$;

create or replace function public.is_application_employer(p_application_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.company_members cm on cm.company_id = j.company_id
    where a.id = p_application_id and cm.user_id = auth.uid()
  )
$$;

-- Új felhasználó: profil létrehozása. Regisztrációkor csak jelölt vagy munkáltató választható.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
begin
  v_role := case new.raw_user_meta_data ->> 'role' when 'employer' then 'employer'::public.user_role else 'candidate'::public.user_role end;
  insert into public.profiles (id, role, full_name, email)
  values (new.id, v_role, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''));
  if v_role = 'candidate' then
    insert into public.candidate_profiles (user_id) values (new.id);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cég létrehozása: a hívó munkáltató lesz a tulajdonos (atomikusan)
create or replace function public.create_company(p_name text, p_description text default null, p_website text default null)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_base text;
  v_slug text;
  v_n int := 1;
begin
  if auth.uid() is null or public.app_role() not in ('employer', 'admin') then
    raise exception 'Csak munkáltatói fiókkal hozható létre cég' using errcode = '42501';
  end if;
  v_base := trim(both '-' from regexp_replace(lower(extensions.unaccent(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'ceg'; end if;
  v_slug := v_base;
  while exists (select 1 from public.companies where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  insert into public.companies (name, slug, description, website, created_by)
  values (trim(p_name), v_slug, p_description, p_website, auth.uid())
  returning id into v_id;
  insert into public.company_members (company_id, user_id, member_role) values (v_id, auth.uid(), 'owner');
  return v_id;
end $$;

-- Jelentkezés státuszváltásainak naplózása
create or replace function public.log_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_events (application_id, from_status, to_status, actor_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.application_events (application_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;

create trigger applications_status_log
  after insert or update of status on public.applications
  for each row execute function public.log_application_status();

-- Az állás helyszíne ugyanahhoz a céghez kell tartozzon
create or replace function public.check_job_venue()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.venues v where v.id = new.venue_id and v.company_id = new.company_id) then
    raise exception 'A helyszín nem ehhez a céghez tartozik' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger jobs_check_venue
  before insert or update of venue_id, company_id on public.jobs
  for each row execute function public.check_job_venue();

-- Lejárt állások lezárása (a cron hívja, 5. fázis)
create or replace function public.expire_jobs()
returns integer language sql security definer set search_path = public as $$
  with u as (
    update public.jobs set status = 'expired'
    where status = 'active' and expires_at <= now()
    returning 1
  )
  select count(*)::int from u
$$;
revoke execute on function public.expire_jobs() from public, anon, authenticated;

-- ===== 0008_rls.sql =====
-- JOBLANTIS – Row Level Security minden táblán, szerepkör szerinti policykkal.
-- Szerveroldali műveletek (jelentkezés, pontszámítás, igazolások, cron) a service role-lal futnak, az megkerüli az RLS-t.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','settlements','companies','company_members','venues','venue_photos',
    'job_role_templates','competencies','template_competencies','work_style_dimensions','swipe_cards',
    'candidate_profiles','candidate_target_roles','candidate_swipe_answers','candidate_skills','work_style_profiles',
    'albums','media_items','media_item_competencies',
    'jobs','job_requirements','job_swipes','applications','application_events','messages',
    'reference_requests','references','reference_competencies','trial_shifts','evaluations','evaluation_items','followups'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ───────────── profiles ─────────────
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.employer_can_view_candidate(id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- a felhasználó a saját szerepkörét nem módosíthatja
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

-- ───────────── katalógus: mindenki olvas, csak admin ír ─────────────
do $$
declare t text;
begin
  foreach t in array array['settlements','job_role_templates','competencies','template_competencies','work_style_dimensions','swipe_cards'] loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end $$;

-- ───────────── companies ─────────────
-- Létrehozás csak a create_company() függvénnyel
create policy companies_select on public.companies for select to anon, authenticated
  using (public.company_has_public_job(id) or public.is_company_member(id) or public.is_admin());
create policy companies_update on public.companies for update to authenticated
  using (public.is_company_member(id) or public.is_admin())
  with check (public.is_company_member(id) or public.is_admin());
create policy companies_delete on public.companies for delete to authenticated
  using (public.is_company_owner(id) or public.is_admin());
revoke insert, update on public.companies from authenticated, anon;
grant update (name, description, website, logo_path) on public.companies to authenticated;

-- ───────────── company_members ─────────────
create policy company_members_select on public.company_members for select to authenticated
  using (user_id = auth.uid() or public.is_company_member(company_id) or public.is_admin());
create policy company_members_insert on public.company_members for insert to authenticated
  with check (public.is_company_owner(company_id) or public.is_admin());
create policy company_members_delete on public.company_members for delete to authenticated
  using ((public.is_company_owner(company_id) and user_id <> auth.uid()) or public.is_admin());

-- ───────────── venues, venue_photos ─────────────
create policy venues_select on public.venues for select to anon, authenticated
  using (public.venue_has_public_job(id) or public.is_company_member(company_id) or public.is_admin());
create policy venues_write on public.venues for all to authenticated
  using (public.is_company_member(company_id) or public.is_admin())
  with check (public.is_company_member(company_id) or public.is_admin());

create policy venue_photos_select on public.venue_photos for select to anon, authenticated
  using (
    public.venue_has_public_job(venue_id)
    or exists (select 1 from public.venues v where v.id = venue_id and public.is_company_member(v.company_id))
    or public.is_admin()
  );
create policy venue_photos_write on public.venue_photos for all to authenticated
  using (exists (select 1 from public.venues v where v.id = venue_id and public.is_company_member(v.company_id)) or public.is_admin())
  with check (exists (select 1 from public.venues v where v.id = venue_id and public.is_company_member(v.company_id)) or public.is_admin());

-- ───────────── jobs, job_requirements ─────────────
create policy jobs_select on public.jobs for select to anon, authenticated
  using ((status = 'active' and expires_at > now()) or public.is_company_member(company_id) or public.is_admin());
create policy jobs_write on public.jobs for all to authenticated
  using (public.is_company_member(company_id) or public.is_admin())
  with check (public.is_company_member(company_id) or public.is_admin());

create policy job_requirements_select on public.job_requirements for select to anon, authenticated
  using (
    public.is_job_public(job_id)
    or exists (select 1 from public.jobs j where j.id = job_id and public.is_company_member(j.company_id))
    or public.is_admin()
  );
create policy job_requirements_write on public.job_requirements for all to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and public.is_company_member(j.company_id)) or public.is_admin())
  with check (exists (select 1 from public.jobs j where j.id = job_id and public.is_company_member(j.company_id)) or public.is_admin());

-- ───────────── jelölt táblák: a jelölt a sajátját kezeli, munkáltató csak jelentkezés után olvas ─────────────
create policy candidate_profiles_select on public.candidate_profiles for select to authenticated
  using (user_id = auth.uid() or public.employer_can_view_candidate(user_id) or public.is_admin());
create policy candidate_profiles_insert on public.candidate_profiles for insert to authenticated
  with check (user_id = auth.uid() and public.app_role() = 'candidate');
create policy candidate_profiles_update on public.candidate_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['candidate_target_roles','work_style_profiles','albums'] loop
    execute format('create policy %I on public.%I for select to authenticated using (candidate_id = auth.uid() or public.employer_can_view_candidate(candidate_id) or public.is_admin())', t || '_select', t);
    execute format('create policy %I on public.%I for all to authenticated using (candidate_id = auth.uid()) with check (candidate_id = auth.uid())', t || '_own', t);
  end loop;
end $$;

create policy media_items_select on public.media_items for select to authenticated
  using (candidate_id = auth.uid() or public.employer_can_view_candidate(candidate_id) or public.is_admin());
create policy media_items_own on public.media_items for all to authenticated
  using (candidate_id = auth.uid())
  with check (candidate_id = auth.uid() and exists (select 1 from public.albums a where a.id = album_id and a.candidate_id = auth.uid()));

create policy media_item_competencies_select on public.media_item_competencies for select to authenticated
  using (exists (
    select 1 from public.media_items m where m.id = media_item_id
      and (m.candidate_id = auth.uid() or public.employer_can_view_candidate(m.candidate_id) or public.is_admin())
  ));
create policy media_item_competencies_own on public.media_item_competencies for all to authenticated
  using (exists (select 1 from public.media_items m where m.id = media_item_id and m.candidate_id = auth.uid()))
  with check (exists (select 1 from public.media_items m where m.id = media_item_id and m.candidate_id = auth.uid()));

-- swipe válaszok: kizárólag a jelölt látja
create policy candidate_swipe_answers_own on public.candidate_swipe_answers for all to authenticated
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

-- készségek: a jelölt csak "bemondott" szintet írhat; igazolt státuszt csak a szerver állít
create policy candidate_skills_select on public.candidate_skills for select to authenticated
  using (candidate_id = auth.uid() or public.employer_can_view_candidate(candidate_id) or public.is_admin());
create policy candidate_skills_insert on public.candidate_skills for insert to authenticated
  with check (candidate_id = auth.uid() and status = 'claimed' and verification_type is null);
create policy candidate_skills_update on public.candidate_skills for update to authenticated
  using (candidate_id = auth.uid() and status = 'claimed')
  with check (candidate_id = auth.uid() and status = 'claimed' and verification_type is null);
create policy candidate_skills_delete on public.candidate_skills for delete to authenticated
  using (candidate_id = auth.uid() and status = 'claimed');

-- álláslapozás: csak a jelölt
create policy job_swipes_own on public.job_swipes for all to authenticated
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

-- ───────────── applications ─────────────
-- Jelentkezni a szerveren keresztül lehet (pontszámítással); itt csak olvasás és munkáltatói státuszváltás.
create policy applications_select on public.applications for select to authenticated
  using (
    candidate_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_id and public.is_company_member(j.company_id))
    or public.is_admin()
  );
create policy applications_employer_update on public.applications for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and public.is_company_member(j.company_id)))
  with check (exists (select 1 from public.jobs j where j.id = job_id and public.is_company_member(j.company_id)));
revoke update on public.applications from authenticated, anon;
grant update (status, decided_at, closed_reason) on public.applications to authenticated;

create policy application_events_select on public.application_events for select to authenticated
  using (public.is_application_participant(application_id) or public.is_admin());

-- ───────────── messages ─────────────
create policy messages_select on public.messages for select to authenticated
  using (public.is_application_participant(application_id) or public.is_admin());
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_application_participant(application_id)
    and exists (select 1 from public.applications a where a.id = application_id and a.status in ('viewed','trial','offer','hired'))
  );
create policy messages_mark_read on public.messages for update to authenticated
  using (public.is_application_participant(application_id) and sender_id <> auth.uid())
  with check (public.is_application_participant(application_id) and sender_id <> auth.uid());
revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;

-- ───────────── ajánlások ─────────────
-- Kérés létrehozása és a referensi űrlap a szerveren fut (token). A jelölt olvassa, jóváhagyja vagy elrejti.
create policy reference_requests_select on public.reference_requests for select to authenticated
  using (candidate_id = auth.uid() or public.is_admin());
create policy reference_requests_delete on public.reference_requests for delete to authenticated
  using (candidate_id = auth.uid() and status in ('pending','reminded'));
revoke insert, update on public.reference_requests from authenticated, anon;

create policy references_select on public."references" for select to authenticated
  using (
    exists (
      select 1 from public.reference_requests r where r.id = request_id
        and (
          r.candidate_id = auth.uid()
          or (approved_at is not null and not hidden and public.employer_can_view_candidate(r.candidate_id))
        )
    )
    or public.is_admin()
  );
create policy references_candidate_update on public."references" for update to authenticated
  using (exists (select 1 from public.reference_requests r where r.id = request_id and r.candidate_id = auth.uid()))
  with check (exists (select 1 from public.reference_requests r where r.id = request_id and r.candidate_id = auth.uid()));
-- a jelölt csak jóváhagyhat és elrejthet, a szöveget nem szerkesztheti
revoke insert, update, delete on public."references" from authenticated, anon;
grant update (approved_at, hidden) on public."references" to authenticated;

create policy reference_competencies_select on public.reference_competencies for select to authenticated
  using (exists (
    select 1 from public."references" f join public.reference_requests r on r.id = f.request_id
    where f.id = reference_id
      and (r.candidate_id = auth.uid()
        or (f.approved_at is not null and not f.hidden and public.employer_can_view_candidate(r.candidate_id))
        or public.is_admin())
  ));
revoke insert, update, delete on public.reference_competencies from authenticated, anon;

-- ───────────── próbanap és értékelés ─────────────
create policy trial_shifts_select on public.trial_shifts for select to authenticated
  using (public.is_application_participant(application_id) or public.is_admin());
create policy trial_shifts_employer_write on public.trial_shifts for all to authenticated
  using (public.is_application_employer(application_id))
  with check (public.is_application_employer(application_id));

create policy evaluations_employer on public.evaluations for all to authenticated
  using (exists (select 1 from public.trial_shifts t where t.id = trial_shift_id and public.is_application_employer(t.application_id)) or public.is_admin())
  with check (exists (select 1 from public.trial_shifts t where t.id = trial_shift_id and public.is_application_employer(t.application_id)));
create policy evaluation_items_employer on public.evaluation_items for all to authenticated
  using (exists (
    select 1 from public.evaluations e join public.trial_shifts t on t.id = e.trial_shift_id
    where e.id = evaluation_id and public.is_application_employer(t.application_id)
  ) or public.is_admin())
  with check (exists (
    select 1 from public.evaluations e join public.trial_shifts t on t.id = e.trial_shift_id
    where e.id = evaluation_id and public.is_application_employer(t.application_id)
  ));

-- ───────────── utókövetés: a cég olvassa, írni csak a szerver ír ─────────────
create policy followups_select on public.followups for select to authenticated
  using (public.is_application_employer(application_id) or public.is_admin());
revoke insert, update, delete on public.followups from authenticated, anon;

-- anon csak olvasni tud, és csak a fenti nyilvános policyk szerint
revoke insert, update, delete on all tables in schema public from anon;

-- ===== 0009_storage.sql =====
-- JOBLANTIS – privát Storage bucketek; a fájlok aláírt URL-lel jelennek meg.
-- Útvonal-konvenció:
--   venue-photos/{company_id}/{venue_id}/{fájl}
--   company-logos/{company_id}/{fájl}
--   candidate-media/{user_id}/{album_id}/{fájl}
--   intro-videos/{user_id}/{fájl}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('venue-photos', 'venue-photos', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('company-logos', 'company-logos', false, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('candidate-media', 'candidate-media', false, 104857600, array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']),
  ('intro-videos', 'intro-videos', false, 104857600, array['video/mp4','video/webm','video/quicktime','image/jpeg','image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cégfájlok: csak a cég tagjai
create policy "company files read" on storage.objects for select to authenticated
  using (bucket_id in ('venue-photos','company-logos')
    and (public.is_company_member(public.try_uuid((storage.foldername(name))[1])) or public.is_admin()));
create policy "company files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('venue-photos','company-logos')
    and public.is_company_member(public.try_uuid((storage.foldername(name))[1])));
create policy "company files update" on storage.objects for update to authenticated
  using (bucket_id in ('venue-photos','company-logos')
    and public.is_company_member(public.try_uuid((storage.foldername(name))[1])));
create policy "company files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('venue-photos','company-logos')
    and public.is_company_member(public.try_uuid((storage.foldername(name))[1])));

-- Jelölt fájlok: a jelölt a saját mappáját kezeli, a munkáltató csak jelentkezés után olvashat
create policy "candidate files read" on storage.objects for select to authenticated
  using (bucket_id in ('candidate-media','intro-videos')
    and (
      public.try_uuid((storage.foldername(name))[1]) = auth.uid()
      or public.employer_can_view_candidate(public.try_uuid((storage.foldername(name))[1]))
      or public.is_admin()
    ));
create policy "candidate files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('candidate-media','intro-videos')
    and public.try_uuid((storage.foldername(name))[1]) = auth.uid());
create policy "candidate files update" on storage.objects for update to authenticated
  using (bucket_id in ('candidate-media','intro-videos')
    and public.try_uuid((storage.foldername(name))[1]) = auth.uid());
create policy "candidate files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('candidate-media','intro-videos')
    and public.try_uuid((storage.foldername(name))[1]) = auth.uid());

-- ===== 0010_public_job_search.sql =====
-- JOBLANTIS – nyilvános állaskeresés szűrőkkel és légvonalbeli távolsággal.
-- security invoker: a hívó jogaival fut, így az RLS (csak aktív, le nem járt állás) érvényes marad.

create or replace function public.search_public_jobs(
  p_template_id integer default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_max_km double precision default null,
  p_wage_period public.wage_period default null,
  p_wage_min integer default null,
  p_seasonal boolean default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (job_id uuid, distance_km double precision)
language sql stable security invoker set search_path = public as $$
  select j.id,
    case when p_lat is null or p_lng is null then null
         else public.distance_km(p_lat, p_lng, s.lat, s.lng) end as distance_km
  from public.jobs j
  join public.venues v on v.id = j.venue_id
  join public.settlements s on s.id = v.settlement_id
  where j.status = 'active' and j.expires_at > now()
    and (p_template_id is null or j.template_id = p_template_id)
    and (p_seasonal is null or j.is_seasonal = p_seasonal)
    and (p_wage_min is null or (j.wage_period = coalesce(p_wage_period, j.wage_period)
         and coalesce(j.wage_max, j.wage_min) >= p_wage_min))
    and (p_max_km is null or p_lat is null or p_lng is null
         or public.distance_km(p_lat, p_lng, s.lat, s.lng) <= p_max_km)
  order by
    case when p_lat is null or p_lng is null then null else public.distance_km(p_lat, p_lng, s.lat, s.lng) end asc nulls last,
    j.published_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

grant execute on function public.search_public_jobs to anon, authenticated;

-- ===== 0011_candidate_helpers.sql =====
-- JOBLANTIS – jelölti segédfüggvények (2. fázis)

-- A jelölt számára releváns kompetenciák: a keresett munkakörök kompetenciái és a meglévő készségei.
create or replace function public.candidate_relevant_competencies()
returns table (id integer, name text, category text)
language sql stable security invoker set search_path = public as $$
  select distinct c.id, c.name, c.category
  from public.competencies c
  where exists (
      select 1 from public.template_competencies tc
      join public.candidate_target_roles r on r.template_id = tc.template_id
      where tc.competency_id = c.id and r.candidate_id = auth.uid()
    )
    or exists (select 1 from public.candidate_skills s where s.competency_id = c.id and s.candidate_id = auth.uid())
  order by c.category, c.name
$$;

grant execute on function public.candidate_relevant_competencies to authenticated;

create schema if not exists joblantis_internal;
create table if not exists joblantis_internal.migrations (name text primary key, applied_at timestamptz not null default now());
insert into joblantis_internal.migrations (name) values
  ('0001_extensions_enums.sql'),
  ('0002_core_tables.sql'),
  ('0003_catalog.sql'),
  ('0004_candidate.sql'),
  ('0005_jobs_applications.sql'),
  ('0006_references_trials.sql'),
  ('0007_functions.sql'),
  ('0008_rls.sql'),
  ('0009_storage.sql'),
  ('0010_public_job_search.sql'),
  ('0011_candidate_helpers.sql')
on conflict do nothing;

commit;
