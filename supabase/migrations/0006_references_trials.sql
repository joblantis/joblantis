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
