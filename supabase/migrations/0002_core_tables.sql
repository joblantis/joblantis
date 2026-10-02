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
