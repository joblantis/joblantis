-- JOBLANTIS – a minta adatok eltávolítása (cégek, helyszínek, állások, jelentkezések kaszkádolva, minta-munkáltató fiók)
begin;
delete from public.jobs where slug like 'minta-%';
delete from public.companies where slug like 'minta-%';
delete from auth.users where id = 'de000000-0000-4000-8000-000000000001';
commit;
