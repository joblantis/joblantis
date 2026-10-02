-- Helyi teszt a 3. fázishoz: illesztés, jelentkezés, jelentkezői lista, értesítések, chat jogosultságok.
-- Futtatás: supabase_stub.sql → migrációk → seed → ez a fájl. Hiba esetén kivételt dob, a végén visszagörget.
\set ON_ERROR_STOP 1
begin;
insert into public.settlements (postal_code, name, county, lat, lng) values
  ('9999', 'Teszt A', 'Teszt', 47.5, 19.04), ('9998', 'Teszt B', 'Teszt', 46.25, 20.15);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@x.hu', '{"role":"employer","full_name":"Anna"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@x.hu', '{"role":"employer","full_name":"Béla"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@x.hu', '{"role":"candidate","full_name":"Cili"}'),
  ('00000000-0000-0000-0000-00000000000e', 'e@x.hu', '{"role":"candidate","full_name":"Endre"}');

-- A munkáltató: pincér állás két kötelező kompetenciával, közeli helyszínen; egy távoli pultos állás
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.create_company('Teszt Bisztró') as company_a \gset
insert into public.venues (id, company_id, name, postal_code, settlement_id) values
  ('10000000-0000-0000-0000-000000000001', :'company_a', 'Közel', '9999', (select id from public.settlements where postal_code = '9999')),
  ('10000000-0000-0000-0000-000000000002', :'company_a', 'Távol', '9998', (select id from public.settlements where postal_code = '9998'));
insert into public.jobs (id, company_id, venue_id, template_id, slug, title, shifts, status, published_at, expires_at) values
  ('20000000-0000-0000-0000-000000000001', :'company_a', '10000000-0000-0000-0000-000000000001',
   (select id from public.job_role_templates where slug = 'pincer'), 'p1', 'Pincér', '{este,hetvege}', 'active', now(), now() + interval '30 days'),
  ('20000000-0000-0000-0000-000000000002', :'company_a', '10000000-0000-0000-0000-000000000001',
   (select id from public.job_role_templates where slug = 'pincer'), 'p2', 'Pincér HACCP nélkül', '{este}', 'active', now(), now() + interval '30 days'),
  ('20000000-0000-0000-0000-000000000003', :'company_a', '10000000-0000-0000-0000-000000000002',
   (select id from public.job_role_templates where slug = 'pincer'), 'p3', 'Pincér messze', '{este}', 'active', now(), now() + interval '30 days');
insert into public.job_requirements (job_id, competency_id, kind) values
  ('20000000-0000-0000-0000-000000000001', (select id from public.competencies where slug = 'haccp'), 'required'),
  ('20000000-0000-0000-0000-000000000001', (select id from public.competencies where slug = 'borismeret'), 'preferred'),
  ('20000000-0000-0000-0000-000000000002', (select id from public.competencies where slug = 'pos-kassza'), 'required'),
  ('20000000-0000-0000-0000-000000000003', (select id from public.competencies where slug = 'haccp'), 'required');

-- Jelölt: kész profil a közeli településen, 20 km utazás, HACCP bemondva, esti műszak
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
update public.candidate_profiles set settlement_id = (select id from public.settlements where postal_code = '9999'),
  postal_code = '9999', travel_km = 20, availability = '{este}', onboarding_step = 'done' where user_id = auth.uid();
insert into public.candidate_target_roles (candidate_id, template_id) values (auth.uid(), (select id from public.job_role_templates where slug = 'pincer'));
insert into public.candidate_skills (candidate_id, competency_id, level) values (auth.uid(), (select id from public.competencies where slug = 'haccp'), 4);
insert into public.work_style_profiles (candidate_id, dimension_id, score) select auth.uid(), id, 70 from public.work_style_dimensions;

do $$
declare d jsonb;
begin
  d := public.match_details(auth.uid(), '20000000-0000-0000-0000-000000000001');
  assert (d ->> 'missing_required')::int = 0, 'HACCP teljesül: ' || d::text;
  assert (d -> 'components' ->> 'shifts')::numeric = 0.5, 'műszak: 1/2';
  assert (d ->> 'distance_km')::numeric = 0, 'azonos település';
  assert (d -> 'components' ->> 'required')::numeric between 0.66 and 0.67, 'bemondott kötelező = 1/1,5';
  assert (d ->> 'work_style_known')::boolean, 'munkastílus ismert';
  assert (d ->> 'score')::numeric between 40 and 100, 'pontszám: ' || (d ->> 'score');

  -- a feed: a távoli állás kimarad, a hiányzó kötelező kompetenciájú hátra kerül
  assert (select count(*) from public.candidate_job_feed()) = 2, 'távoli állás nincs a feedben';
  assert (select job_id from public.candidate_job_feed() limit 1) = '20000000-0000-0000-0000-000000000001', 'teljesülő állás elöl';
  assert (select missing_required from public.candidate_job_feed() offset 1 limit 1) = 1, 'hiányzó kötelező hátul, de látszik';
  assert (select count(*) from public.candidate_job_feed(p_max_km => 500)) = 3, 'nagyobb körzettel a távoli is';

  -- közvetlen jelentkezés tiltott, az RPC működik
  begin
    insert into public.applications (job_id, candidate_id) values ('20000000-0000-0000-0000-000000000001', auth.uid());
    assert false, 'közvetlen insert tiltott';
  exception when insufficient_privilege then null;
  end;
end $$;

select public.apply_to_job('20000000-0000-0000-0000-000000000001') as app_id \gset
do $$ begin
  assert public.apply_to_job('20000000-0000-0000-0000-000000000001') = (select id from public.applications), 'idempotens jelentkezés';
  assert (select match_score from public.applications) is not null, 'pontszám-pillanatkép';
  assert (select direction from public.job_swipes where job_id = '20000000-0000-0000-0000-000000000001') = 'right', 'swipe rögzítve';
  assert (select count(*) from public.candidate_job_feed()) = 1, 'megpályázott állás kikerül a feedből';
  -- a jelölt nem írhat még üzenetet (új státusz)
  begin
    insert into public.messages (application_id, sender_id, body) values ((select id from public.applications), auth.uid(), 'Szia');
    assert false, 'chat csak megnézve státusztól';
  exception when insufficient_privilege then null;
  end;
  -- státuszt nem állíthat
  update public.applications set status = 'hired';
  assert (select status from public.applications) = 'new', 'jelölt nem válthat státuszt';
end $$;

-- Befejezetlen profillal nem lehet jelentkezni
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  begin
    perform public.apply_to_job('20000000-0000-0000-0000-000000000001');
    assert false, 'befejezetlen profil';
  exception when raise_exception then null;
  end;
end $$;

-- A munkáltató: értesítés, jelentkezői lista élő pontszámmal, B nem lát semmit
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.notifications where kind = 'application_new') = 1, 'új jelentkező értesítés';
  assert (select count(*) from public.job_applicants('20000000-0000-0000-0000-000000000001')) = 1, 'A látja a jelentkezőt';
  assert (select details ->> 'distance_km' from public.job_applicants('20000000-0000-0000-0000-000000000001')) = '0.0', 'távolság a munkáltatónak';
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.job_applicants('20000000-0000-0000-0000-000000000001')) = 0, 'B nem látja';
  assert (select count(*) from public.notifications) = 0, 'B nem lát értesítést';
  assert public.match_details('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001') is null, 'B nem számolhat';
  assert (select count(*) from public.my_conversations()) = 0, 'B-nek nincs beszélgetése';
end $$;

-- A jobbra húz: megnézve → chat nyílik, a jelölt értesítést kap
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.applications set status = 'viewed', decided_at = now();
insert into public.messages (application_id, sender_id, body) values (:'app_id', auth.uid(), 'Szia, mikor érsz rá?');
insert into public.messages (application_id, sender_id, body) values (:'app_id', auth.uid(), 'Holnap?');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.notifications where kind = 'application_status') = 1, 'megnézve értesítés';
  assert (select count(*) from public.notifications where kind = 'message') = 1, 'olvasatlan üzenet-értesítés nem duplikálódik';
  assert public.unread_message_count() = 2, 'két olvasatlan';
  assert (select unread from public.my_conversations()) = 2, 'beszélgetés lista';
end $$;
update public.messages set read_at = now() where sender_id <> auth.uid();
insert into public.messages (application_id, sender_id, body) values (:'app_id', auth.uid(), 'Holnap jó!');
do $$ begin
  assert public.unread_message_count() = 0, 'olvasott';
  -- a jelölt nem jelölheti olvasottnak a saját üzenetét és nem írhatja át a szöveget
  begin
    update public.messages set body = 'átírva';
    assert false, 'szöveg nem módosítható';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Lejárt állás után is látja a megpályázott állást, céget
reset role;
update public.jobs set expires_at = now() - interval '1 day' where id = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert exists (select 1 from public.jobs where id = '20000000-0000-0000-0000-000000000001'), 'megpályázott állás látható';
  assert (select count(*) from public.my_conversations()) = 1, 'beszélgetés megmarad';
end $$;

-- Elutasítás: udvarias értesítés a jelöltnek
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.applications set status = 'rejected';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.notifications where kind = 'application_rejected') = 1, 'elutasítás értesítés';
  begin
    insert into public.messages (application_id, sender_id, body) values ((select id from public.applications), auth.uid(), 'De miért?');
    assert false, 'elutasítás után nincs chat';
  exception when insufficient_privilege then null;
  end;
  update public.notifications set read_at = now();
  assert (select count(*) from public.notifications where read_at is null) = 0, 'értesítés olvasottra állítható';
end $$;

reset role;
select '3. FÁZIS TESZT OK' as eredmeny;
rollback;
