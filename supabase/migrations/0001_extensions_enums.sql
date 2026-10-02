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
