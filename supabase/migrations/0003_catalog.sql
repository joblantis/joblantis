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
