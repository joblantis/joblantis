-- Helyi teszt a 4. fázishoz: ajánláskérés, referensi űrlap, jóváhagyás/elrejtés, próbanap, értékelés, igazolt státuszok.
-- Futtatás: supabase_stub.sql → migrációk → seed → ez a fájl. Hiba esetén kivételt dob, a végén visszagörget.
\set ON_ERROR_STOP 1
begin;
insert into public.settlements (postal_code, name, county, lat, lng) values ('9999', 'Teszt A', 'Teszt', 47.5, 19.04);
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@x.hu', '{"role":"employer","full_name":"Anna"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@x.hu', '{"role":"employer","full_name":"Béla"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@x.hu', '{"role":"candidate","full_name":"Cili"}');

-- Jelölt: pincér, HACCP bemondva (kártyán is), borismeret nincs
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
update public.candidate_profiles set settlement_id = (select id from public.settlements where postal_code = '9999'),
  postal_code = '9999', travel_km = 20, availability = '{este}', onboarding_step = 'done' where user_id = auth.uid();
insert into public.candidate_target_roles (candidate_id, template_id) values (auth.uid(), (select id from public.job_role_templates where slug = 'pincer'));
insert into public.candidate_skills (candidate_id, competency_id, level) values (auth.uid(), (select id from public.competencies where slug = 'haccp'), 3);

-- Ajánláskérés: érvénytelen adatok elutasítva, érvényes létrejön
do $$ begin
  begin
    perform public.create_reference_request('Régi Hely', 'Kovács Béla', 'nem-email', 'Pincér', '2023-01-01', '2024-01-01', repeat('a', 64));
    assert false, 'rossz email';
  exception when raise_exception then null;
  end;
  perform public.create_reference_request('Régi Hely', 'Kovács Béla', 'bela@regi.hu', 'Pincér', '2023-01-01', '2024-01-01', repeat('a', 64));
  perform public.create_reference_request('Másik Hely', 'Nagy Éva', 'eva@masik.hu', 'Pincér', '2022-01-01', null, repeat('b', 64));
  assert (select count(*) from public.reference_requests) = 2, 'két kérés';
  -- a jelölt nem írhat közvetlenül referenciát
  begin
    insert into public."references" (request_id, employment_confirmed) values ((select id from public.reference_requests limit 1), true);
    assert false, 'közvetlen ajánlás tiltott';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Referens (anon): token alapján látja az űrlapot, kitölti
reset role;
set local role anon;
set local request.jwt.claim.sub = '';
do $$
declare r record;
begin
  select * into r from public.reference_request_by_token(repeat('a', 64));
  assert r.status = 'open' and r.candidate_name = 'Cili', 'űrlap adatai';
  assert jsonb_array_length(r.competencies) >= 6, 'választható kompetenciák';
  assert (select count(*) from public.reference_request_by_token(repeat('z', 64))) = 0, 'ismeretlen token';
  assert (select count(*) from public.reference_requests) = 0, 'anon nem lát kérést';

  perform public.submit_reference(repeat('a', 64), true,
    array[(select id from public.competencies where slug = 'haccp'), (select id from public.competencies where slug = 'borismeret'),
          (select id from public.competencies where slug = 'latte-art')],
    'Megbízható, gyors pincér.', true);
  -- második kitöltés nem megy
  begin
    perform public.submit_reference(repeat('a', 64), true, '{}', null, null);
    assert false, 'egyszer tölthető ki';
  exception when raise_exception then null;
  end;
  assert (select status from public.reference_request_by_token(repeat('a', 64))) = 'completed', 'kitöltve';
  assert (select candidate_name from public.reference_request_by_token(repeat('a', 64))) is null, 'kitöltés után nincs személyes adat';
  -- túl hosszú szöveg
  begin
    perform public.submit_reference(repeat('b', 64), true, '{}', repeat('x', 601), null);
    assert false, '600 karakter';
  exception when raise_exception then null;
  end;
end $$;

-- Jelölt: értesítés, jóváhagyás előtt nincs igazolás; a nem releváns kompetencia (latte art) kimaradt
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.notifications where kind = 'reference') = 1, 'ajánlás értesítés';
  assert (select count(*) from public.candidate_references(auth.uid())) = 1, 'jelölt látja';
  assert (select cardinality(competencies) from public.candidate_references(auth.uid())) = 2, 'csak releváns kompetenciák';
  assert not exists (select 1 from public.candidate_skills where status = 'verified'), 'jóváhagyás előtt nincs igazolás';
  -- a szöveg nem szerkeszthető
  begin
    update public."references" set recommendation = 'átírva';
    assert false, 'szöveg nem szerkeszthető';
  exception when insufficient_privilege then null;
  end;
end $$;
update public."references" set approved_at = now();
do $$ begin
  assert (select status from public.candidate_skills where competency_id = (select id from public.competencies where slug = 'haccp')) = 'verified',
    'HACCP igazolt (referencia)';
  assert (select verification_type from public.candidate_skills where competency_id = (select id from public.competencies where slug = 'borismeret')) = 'reference',
    'borismeret igazolt (referencia)';
end $$;
-- elrejtés: a kártyán is jelölt HACCP visszaáll bemondottra, a csak referenciából származó borismeret törlődik
insert into public.candidate_swipe_answers (candidate_id, card_id, direction)
  select auth.uid(), id, 'right' from public.swipe_cards where competency_id = (select id from public.competencies where slug = 'haccp') limit 1;
update public."references" set hidden = true;
do $$ begin
  assert (select status from public.candidate_skills where competency_id = (select id from public.competencies where slug = 'haccp')) = 'claimed',
    'elrejtés után HACCP bemondott';
  assert not exists (select 1 from public.candidate_skills where competency_id = (select id from public.competencies where slug = 'borismeret')),
    'elrejtés után a referenciából jött borismeret eltűnik';
end $$;
update public."references" set hidden = false, approved_at = null;
do $$ begin
  assert (select approved_at from public."references") is not null, 'jóváhagyás nem vonható vissza';
  assert (select count(*) from public.candidate_skills where verification_type = 'reference') = 2, 'újra megjelenítve igazolt';
end $$;

-- Munkáltató A: cég, állás, a jelölt jelentkezik, A érdeklődik
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.create_company('Próba Bisztró') as company_a \gset
insert into public.venues (id, company_id, name, postal_code, settlement_id)
  values ('10000000-0000-0000-0000-000000000001', :'company_a', 'Bisztró', '9999', (select id from public.settlements where postal_code = '9999'));
insert into public.jobs (id, company_id, venue_id, template_id, slug, title, shifts, status, published_at, expires_at)
  values ('20000000-0000-0000-0000-000000000001', :'company_a', '10000000-0000-0000-0000-000000000001',
   (select id from public.job_role_templates where slug = 'pincer'), 'p1', 'Pincér', '{este}', 'active', now(), now() + interval '30 days');
insert into public.job_requirements (job_id, competency_id, kind) values
  ('20000000-0000-0000-0000-000000000001', (select id from public.competencies where slug = 'pos-kassza'), 'required'),
  ('20000000-0000-0000-0000-000000000001', (select id from public.competencies where slug = 'tobb-asztal'), 'preferred');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public.apply_to_job('20000000-0000-0000-0000-000000000001') as app_id \gset

set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.candidate_references('00000000-0000-0000-0000-00000000000c')) = 1, 'A látja a jóváhagyott ajánlást';
  assert (select count(*) from public.reference_requests) = 0, 'A nem látja a referens email címét';
end $$;
update public.applications set status = 'trial';
-- próbanap a múltban nem fogadható el, a jövőben igen
insert into public.trial_shifts (id, application_id, starts_at, duration_minutes, is_paid, proposed_by) values
  ('40000000-0000-0000-0000-000000000001', :'app_id', now() + interval '2 days', 240, true, auth.uid());

-- B nem lát és nem ír próbanapot
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.trial_shifts) = 0, 'B nem látja';
  begin
    perform public.submit_trial_evaluation('40000000-0000-0000-0000-000000000001', '{}'::jsonb, null);
    assert false, 'B nem értékelhet';
  exception when insufficient_privilege then null;
  end;
end $$;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.notifications where kind = 'trial') = 1, 'próbanap-ajánlat értesítés';
  begin
    update public.trial_shifts set status = 'accepted';
    assert (select status from public.trial_shifts) = 'proposed', 'közvetlenül nem fogadhatja el';
  end;
  perform public.respond_trial_shift('40000000-0000-0000-0000-000000000001', true);
  assert (select status from public.trial_shifts) = 'accepted', 'elfogadva';
  begin
    perform public.submit_trial_evaluation('40000000-0000-0000-0000-000000000001', '{}'::jsonb, null);
    assert false, 'jelölt nem értékel';
  exception when insufficient_privilege then null;
  end;
end $$;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.notifications where kind = 'trial') = 1, 'A értesítést kap az elfogadásról';
  begin
    perform public.submit_trial_evaluation('40000000-0000-0000-0000-000000000001',
      jsonb_build_object((select id from public.competencies where slug = 'pos-kassza')::text, 5), null);
    assert false, 'jövőbeli próbanap nem értékelhető';
  exception when raise_exception then null;
  end;
end $$;
-- idő ugrás: a próbanap megtörtént
reset role;
update public.trial_shifts set starts_at = now() - interval '1 hour';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  -- minden kötelező/előnyös kompetenciát pontozni kell
  begin
    perform public.submit_trial_evaluation('40000000-0000-0000-0000-000000000001',
      jsonb_build_object((select id from public.competencies where slug = 'pos-kassza')::text, 5), null);
    assert false, 'hiányos pontozás';
  exception when raise_exception then null;
  end;
  -- idegen kompetencia nem pontozható
  begin
    perform public.submit_trial_evaluation('40000000-0000-0000-0000-000000000001',
      jsonb_build_object((select id from public.competencies where slug = 'pos-kassza')::text, 5,
                         (select id from public.competencies where slug = 'tobb-asztal')::text, 3,
                         (select id from public.competencies where slug = 'latte-art')::text, 5), null);
    assert false, 'idegen kompetencia';
  exception when raise_exception then null;
  end;
  perform public.submit_trial_evaluation('40000000-0000-0000-0000-000000000001',
    jsonb_build_object((select id from public.competencies where slug = 'pos-kassza')::text, 5,
                       (select id from public.competencies where slug = 'tobb-asztal')::text, 3), 'Ügyes volt.');
  assert (select status from public.trial_shifts) = 'completed', 'lezárva';
  begin
    perform public.submit_trial_evaluation('40000000-0000-0000-0000-000000000001', '{}'::jsonb, null);
    assert false, 'egyszer értékelhető';
  exception when raise_exception then null;
  end;
end $$;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select verification_type from public.candidate_skills where competency_id = (select id from public.competencies where slug = 'pos-kassza')) = 'trial',
    'POS igazolt (próbanap), 4+ pont';
  assert (select level from public.candidate_skills where competency_id = (select id from public.competencies where slug = 'pos-kassza')) = 5, 'szint a pontszám';
  assert not exists (select 1 from public.candidate_skills where competency_id = (select id from public.competencies where slug = 'tobb-asztal')),
    '3 pont nem igazol';
  assert (select count(*) from public.evaluations) = 0, 'a jelölt nem látja az értékelés részleteit';
  assert (select (public.match_details(auth.uid(), '20000000-0000-0000-0000-000000000001') ->> 'required_verified')::int) = 1, 'a rangsorban igazolt';
end $$;

reset role;
select '4. FÁZIS TESZT OK' as eredmeny;
rollback;
