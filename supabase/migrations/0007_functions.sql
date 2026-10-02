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
