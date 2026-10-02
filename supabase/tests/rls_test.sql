-- Helyi RLS-teszt (supabase_stub.sql + migrációk + seed után). Hiba esetén kivételt dob.
\set ON_ERROR_STOP 1
begin;
insert into public.settlements (postal_code, name, county, lat, lng) values
  ('9999', 'Teszt A', 'Teszt', 47.5, 19.04), ('9998', 'Teszt B', 'Teszt', 46.25, 20.15);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@x.hu', '{"role":"employer","full_name":"Anna"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@x.hu', '{"role":"employer","full_name":"Béla"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@x.hu', '{"role":"candidate","full_name":"Cili"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@x.hu', '{"role":"admin","full_name":"Hacker"}');

do $$ begin
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000d') = 'candidate', 'admin nem regisztrálható';
  assert exists (select 1 from public.candidate_profiles where user_id = '00000000-0000-0000-0000-00000000000c'), 'jelölt profil létrejön';
end $$;

-- A munkáltató: cég, helyszín, aktív és vázlat állás
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.create_company('Árvíztűrő Bisztró Kft.') as company_a \gset
insert into public.venues (id, company_id, name, postal_code, settlement_id)
  values ('10000000-0000-0000-0000-000000000001', :'company_a', 'Belváros', '9999', (select id from public.settlements where postal_code = '9999'));
insert into public.jobs (id, company_id, venue_id, template_id, slug, title, status, published_at, expires_at)
  values ('20000000-0000-0000-0000-000000000001', :'company_a', '10000000-0000-0000-0000-000000000001',
          (select id from public.job_role_templates where slug = 'pincer'), 'pincer-aktiv', 'Pincér', 'active', now(), now() + interval '30 days'),
         ('20000000-0000-0000-0000-000000000002', :'company_a', '10000000-0000-0000-0000-000000000001',
          (select id from public.job_role_templates where slug = 'pincer'), 'pincer-vazlat', 'Pincér vázlat', 'draft', null, null);
do $$ begin
  assert (select slug from public.companies) = 'arvizturo-bisztro-kft', 'slug: ' || (select slug from public.companies);
  -- saját szerepkör nem módosítható
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    assert false, 'szerepkör módosítás tiltott';
  exception when insufficient_privilege then null;
  end;
end $$;

-- B munkáltató nem látja A vázlatát és nem írhat bele
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.jobs) = 1, 'B csak a nyilvános állást látja';
  assert not exists (select 1 from public.jobs where status = 'draft'), 'B nem látja a vázlatot';
  update public.jobs set title = 'feltört' where id = '20000000-0000-0000-0000-000000000001';
  assert (select title from public.jobs where id = '20000000-0000-0000-0000-000000000001') = 'Pincér', 'B nem módosíthat';
  begin
    insert into public.venues (company_id, name, postal_code, settlement_id)
      values ((select id from public.companies limit 1), 'Betolakodó', '9999', 1);
    assert false, 'B nem hozhat létre helyszínt A cégénél';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Jelölt: nem állíthat be igazolt készséget, nem lát más jelöltet
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into public.candidate_skills (candidate_id, competency_id, level)
  values (auth.uid(), (select id from public.competencies where slug = 'haccp'), 3);
do $$ begin
  begin
    insert into public.candidate_skills (candidate_id, competency_id, level, status, verification_type)
      values (auth.uid(), (select id from public.competencies where slug = 'borismeret'), 5, 'verified', 'trial');
    assert false, 'jelölt nem írhat igazolt státuszt';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.applications (job_id, candidate_id) values ('20000000-0000-0000-0000-000000000001', auth.uid());
    assert false, 'jelentkezés csak szerveren keresztül';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A munkáltató addig nem látja a jelöltet, amíg nem jelentkezett
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.candidate_profiles) = 0, 'munkáltató nem lát jelöltet jelentkezés nélkül';
  assert (select count(*) from public.candidate_skills) = 0, 'munkáltató nem lát készséget jelentkezés nélkül';
end $$;

-- Jelentkezés (szerver / service role nevében)
reset role;
insert into public.applications (job_id, candidate_id) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.candidate_profiles) = 1, 'jelentkezés után A látja a jelöltet';
  assert (select count(*) from public.candidate_skills) = 1, 'jelentkezés után A látja a készségeket';
  assert (select count(*) from public.applications) = 1, 'A látja a jelentkezést';
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.candidate_profiles) = 0, 'B nem látja A jelöltjét';
  assert (select count(*) from public.applications) = 0, 'B nem látja A jelentkezéseit';
end $$;

-- Anon: csak aktív állás, kapcsolódó helyszín és cég, katalógus
set local role anon;
set local request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from public.jobs) = 1, 'anon csak az aktív állást látja';
  assert (select count(*) from public.venues) = 1, 'anon látja az aktív állás helyszínét';
  assert (select count(*) from public.companies) = 1, 'anon látja az aktív állás cégét';
  assert (select count(*) from public.job_role_templates) = 10, 'anon látja a sablonokat';
  assert (select count(*) from public.profiles) = 0, 'anon nem lát profilt';
  assert (select count(*) from public.applications) = 0, 'anon nem lát jelentkezést';
end $$;

-- Storage: jelölt csak a saját mappájába tölthet
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into storage.objects (bucket_id, name) values ('candidate-media', '00000000-0000-0000-0000-00000000000c/album/kep.jpg');
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('candidate-media', '00000000-0000-0000-0000-00000000000b/x.jpg');
    assert false, 'idegen mappába nem tölthet';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 2. fázis: jelölti albumok, kártyaválaszok, releváns kompetenciák
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into public.candidate_target_roles (candidate_id, template_id) values (auth.uid(), (select id from public.job_role_templates where slug = 'barista'));
insert into public.candidate_swipe_answers (candidate_id, card_id, direction)
  select auth.uid(), id, 'right' from public.swipe_cards where template_id = (select id from public.job_role_templates where slug = 'barista') limit 3;
insert into public.albums (id, candidate_id, title) values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'Kávék');
insert into public.media_items (album_id, candidate_id, kind, file_path, thumb_path)
  values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'image', 'x/y.webp', 'x/y_thumb.webp');
do $$ begin
  assert (select count(*) from public.candidate_relevant_competencies()) >= 8, 'releváns kompetenciák';
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.albums) = 0, 'B nem látja a jelölt albumát';
  assert (select count(*) from public.candidate_swipe_answers) = 0, 'munkáltató nem látja a swipe válaszokat';
  begin
    insert into public.media_items (album_id, candidate_id, kind, file_path)
      values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'image', 'z.webp');
    assert false, 'idegen albumba nem írhat';
  exception when insufficient_privilege then null;
  end;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.albums) = 1, 'A (jelentkezés után) látja az albumot';
  assert (select count(*) from public.media_items) = 1, 'A látja a médiát';
  assert (select count(*) from public.candidate_swipe_answers) = 0, 'a nyers swipe válaszok privátak';
end $$;

reset role;
select 'RLS TESZT OK' as eredmeny;
rollback;
