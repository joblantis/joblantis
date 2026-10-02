-- JOBLANTIS – 3. fázis advisor-finomítás: a has_applied_* segédfüggvények csak bejelentkezett policykban szerepelnek
revoke execute on function public.has_applied_to_job(uuid) from public, anon;
revoke execute on function public.has_applied_to_company(uuid) from public, anon;
revoke execute on function public.has_applied_to_venue(uuid) from public, anon;
grant execute on function public.has_applied_to_job(uuid) to authenticated;
grant execute on function public.has_applied_to_company(uuid) to authenticated;
grant execute on function public.has_applied_to_venue(uuid) to authenticated;
