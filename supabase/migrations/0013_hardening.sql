-- JOBLANTIS – biztonsági finomítás a Supabase advisor alapján

-- rögzített search_path a maradék függvényekre
alter function public.set_updated_at() set search_path = public;
alter function public.try_uuid(text) set search_path = public;
alter function public.distance_km(double precision, double precision, double precision, double precision) set search_path = public;
alter function public.check_job_venue() set search_path = public;

-- triggerfüggvények: API-n keresztül senki ne hívhassa
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_application_status() from public, anon, authenticated;
revoke execute on function public.check_job_venue() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- cég létrehozása csak bejelentkezve
revoke execute on function public.create_company(text, text, text) from public, anon;
grant execute on function public.create_company(text, text, text) to authenticated;

-- A többi security definer segédfüggvény (is_admin, is_company_member, employer_can_view_candidate,
-- *_has_public_job, is_application_*) szándékosan hívható: az RLS-policyk anon/authenticated
-- szerepben is ezeket használják, és mindig csak a hívó saját jogosultságáról adnak választ.
