-- Helyi teszt az 5. fázishoz: nincs ghosting (3. napi emlékeztető, 5. napi lezárás), utókövetés, admin funkciók.
-- Futtatás: supabase_stub.sql → migrációk → seed → ez a fájl. Hiba esetén kivételt dob, a végén visszagörget.
\set ON_ERROR_STOP 1
begin;
insert into public.settlements (postal_code, name, county, lat, lng) values ('9999', 'Teszt A', 'Teszt', 47.5, 19.04);
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@x.hu', '{"role":"employer","full_name":"Anna"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@x.hu', '{"role":"candidate","full_name":"Cili"}'),
  ('00000000-0000-0000-0000-00000000000e', 'e@x.hu', '{"role":"candidate","full_name":"Endre"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@x.hu', '{"role":"candidate","full_name":"Dóra"}');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.create_company('Ghost Bisztró') as company_a \gset
insert into public.venues (id, company_id, name, postal_code, settlement_id)
  values ('10000000-0000-0000-0000-000000000001', :'company_a', 'Bisztró', '9999', (select id from public.settlements where postal_code = '9999'));
insert into public.jobs (id, company_id, venue_id, template_id, slug, title, status, published_at, expires_at) values
  ('20000000-0000-0000-0000-000000000001', :'company_a', '10000000-0000-0000-0000-000000000001',
   (select id from public.job_role_templates where slug = 'pincer'), 'p1', 'Pincér', 'active', now(), now() + interval '30 days'),
  ('20000000-0000-0000-0000-000000000002', :'company_a', '10000000-0000-0000-0000-000000000001',
   (select id from public.job_role_templates where slug = 'pincer'), 'p2', 'Lejárt pincér', 'active', now() - interval '40 days', now() + interval '1 hour');

-- két jelölt jelentkezik
reset role;
update public.candidate_profiles set onboarding_step = 'done';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.apply_to_job('20000000-0000-0000-0000-000000000001') as app_c \gset
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select public.apply_to_job('20000000-0000-0000-0000-000000000001') as app_e \gset

-- a jelentkezők nem futtathatják az ütemezett feladatokat
do $$ begin
  begin
    perform public.run_scheduled_jobs();
    assert false, 'run_scheduled_jobs tiltott';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_set_role(auth.uid(), 'admin');
    assert false, 'csak admin';
  exception when insufficient_privilege then null;
  end;
  assert public.admin_stats() is null, 'statisztika csak adminnak';
end $$;

-- idő ugrás: C jelentkezése 3,5 napos, E-é 5,5 napos; a másik állás lejárt
reset role;
update public.applications set created_at = now() - interval '3 days 12 hours', response_due_at = now() + interval '1 day 12 hours' where id = :'app_c';
update public.applications set created_at = now() - interval '5 days 12 hours', response_due_at = now() - interval '12 hours' where id = :'app_e';
update public.jobs set expires_at = now() - interval '1 minute' where id = '20000000-0000-0000-0000-000000000002';
delete from public.notifications;

do $$
declare r jsonb;
begin
  r := public.run_scheduled_jobs();
  assert (r ->> 'reminded')::int = 1, '3. napi emlékeztető: ' || r::text;
  assert (r ->> 'auto_closed')::int = 1, '5. napi lezárás: ' || r::text;
  assert (r ->> 'expired_jobs')::int = 1, 'lejárt állás: ' || r::text;
  r := public.run_scheduled_jobs();
  assert (r ->> 'reminded')::int = 0 and (r ->> 'auto_closed')::int = 0, 'egyszer fut le: ' || r::text;
end $$;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.notifications where kind = 'reminder' and title like 'Válaszra vár%') = 1, 'munkáltatói emlékeztető';
  assert (select count(*) from public.notifications where kind = 'reminder' and title like 'Automatikusan lezárva%') = 1, 'lezárás értesítés a cégnek';
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  assert (select status from public.applications) = 'auto_closed', 'lezárva';
  assert (select title from public.notifications) like 'Lezárult a jelentkezésed%', 'udvarias értesítés a jelöltnek';
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select status from public.applications) = 'new', 'C még nyitott';
  assert (select count(*) from public.notifications) = 0, 'C nem kap értesítést az emlékeztetőről';
end $$;

-- felvétel → utókövetés ütemezése
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.applications set status = 'hired' where id = :'app_c';
do $$ begin
  assert (select count(*) from public.followups) = 3, '30/90/180 napos utókövetés';
  assert (select array_agg(day_offset order by day_offset) from public.followups) = '{30,90,180}', 'napok';
  begin
    update public.followups set still_employed = true;
    assert false, 'közvetlenül nem írható';
  exception when insufficient_privilege then null;
  end;
end $$;

-- idő ugrás: esedékes a 30 napos
reset role;
update public.followups set due_at = now() - interval '1 hour' where day_offset = 30;
do $$
declare r record;
begin
  select * into r from public.claim_due_followups(10);
  assert r.day_offset = 30 and r.recipient_emails = '{a@x.hu}', 'kiküldendő utókövetés';
  assert (select count(*) from public.claim_due_followups(10)) = 0, 'egyszer foglalható le';
  update public.followups set token_hash = repeat('f', 64) where id = r.followup_id;
end $$;

-- a munkáltató emailből, bejelentkezés nélkül válaszol
set local role anon;
set local request.jwt.claim.sub = '';
do $$ begin
  assert (select status from public.followup_by_token(repeat('f', 64))) = 'open', 'nyitott kérdés';
  assert (select candidate_name from public.followup_by_token(repeat('f', 64))) = 'Cili', 'jelölt neve';
  begin
    perform public.submit_followup(repeat('f', 64), true, 6::smallint, 4::smallint, 4::smallint);
    assert false, 'pontszám 1–5';
  exception when raise_exception then null;
  end;
  perform public.submit_followup(repeat('f', 64), false, 4::smallint, 3::smallint, 5::smallint);
  begin
    perform public.submit_followup(repeat('f', 64), true, null, null, null);
    assert false, 'egyszer válaszolható';
  exception when raise_exception then null;
  end;
  assert (select status from public.followup_by_token(repeat('f', 64))) = 'answered', 'megválaszolva';
  assert (select count(*) from public.followups) = 0, 'anon nem látja a táblát';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.followups where cancelled_at is not null) = 2, 'már nem dolgozik ott → a többi elmarad';
  assert (select reliable from public.followups where day_offset = 30) = 4, 'válasz eltárolva';
end $$;

-- admin: szerepkör, statisztika, moderálás
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000d';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  assert (public.admin_stats() ->> 'auto_closed')::int = 1, 'admin statisztika';
  perform public.admin_set_role('00000000-0000-0000-0000-00000000000e', 'employer');
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000e') = 'employer', 'szerepkör módosítva';
  begin
    perform public.admin_set_role(auth.uid(), 'candidate');
    assert false, 'saját admin jog nem vehető el';
  exception when raise_exception then null;
  end;
  -- katalógus szerkesztése
  update public.swipe_cards set is_active = false where id = (select min(id) from public.swipe_cards);
  assert (select count(*) from public.swipe_cards where not is_active) = 1, 'admin szerkeszti a kártyákat';
  insert into public.competencies (slug, name, category) values ('teszt-komp', 'Teszt kompetencia', 'szakmai');
  update public.template_work_styles set target = 50 where template_id = (select id from public.job_role_templates where slug = 'pincer');
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  update public.swipe_cards set is_active = true;
  assert (select count(*) from public.swipe_cards where not is_active) = 1, 'munkáltató nem szerkeszti a katalógust';
end $$;

reset role;
select '5. FÁZIS TESZT OK' as eredmeny;
rollback;
