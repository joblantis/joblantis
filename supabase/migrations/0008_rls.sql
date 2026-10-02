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
