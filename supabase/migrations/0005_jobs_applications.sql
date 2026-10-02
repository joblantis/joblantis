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
