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
