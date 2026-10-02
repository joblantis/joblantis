-- JOBLANTIS – MINTA ADATOK (bemutatóhoz / teszteléshez). Kitalált cégek, helyszínek és állások,
-- minden munkakörben 2–3 hirdetés. Újrafuttatható; eltávolítás: supabase/seed/demo/remove_demo.sql
-- A minta-munkáltató fióknak nincs jelszava, nem lehet vele belépni.

begin;

-- minta-munkáltató (a profilt az on_auth_user_created trigger hozza létre)
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values ('de000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'minta-munkaltato@joblantis.invalid', '{"role":"employer","full_name":"Minta Munkáltató"}', '{"provider":"email","providers":["email"]}', now(), now())
on conflict (id) do nothing;

-- cégek
with c (slug, name, description, website) as (values
  ('minta-duna-bisztro', 'Duna Bisztró (minta)', 'Minta cég – bemutató adat. Modern magyar konyha a belvárosban és Szentendrén, à la carte és rendezvények.', null),
  ('minta-tiszaparti-vendeglo', 'Tiszaparti Vendéglő (minta)', 'Minta cég – bemutató adat. Halételek és szegedi klasszikusok, nagy terasz a Tisza-parton.', null),
  ('minta-balaton-resort', 'Balaton Resort Hotel (minta)', 'Minta cég – bemutató adat. Négycsillagos szálloda a Balaton partján, étteremmel, beach bárral és bankettel.', null),
  ('minta-hegyalja-kavehaz', 'Hegyalja Kávéház (minta)', 'Minta cég – bemutató adat. Specialty kávézó és reggeliző Egerben és Miskolcon.', null),
  ('minta-pannon-szallo', 'Pannon Szálló (minta)', 'Minta cég – bemutató adat. Városi szállodák Győrben és Sopronban, konferenciateremmel.', null),
  ('minta-mecsek-gasztro', 'Mecsek Gasztró (minta)', 'Minta cég – bemutató adat. Bisztró és koktélbár Pécs belvárosában.', null),
  ('minta-heviz-spa-hotel', 'Hévíz Spa & Wellness Hotel (minta)', 'Minta cég – bemutató adat. Wellness szálloda Hévízen és Keszthelyen, egész éves nyitva tartással.', null),
  ('minta-nagyerdo-etterem', 'Nagyerdő Étterem (minta)', 'Minta cég – bemutató adat. Családi étterem és rendezvényhelyszín Debrecenben.', null)
)
insert into public.companies (name, slug, description, website, created_by)
select c.name, c.slug, c.description, c.website, 'de000000-0000-4000-8000-000000000001' from c
on conflict (slug) do update set name = excluded.name, description = excluded.description;

insert into public.company_members (company_id, user_id, member_role)
select id, 'de000000-0000-4000-8000-000000000001', 'owner' from public.companies where slug like 'minta-%'
on conflict do nothing;

-- helyszínek (a település az irányítószám-táblából: a legkisebb irányítószámú egyezés)
with v (company_slug, venue_name, city, address, description) as (values
  ('minta-duna-bisztro', 'Duna Bisztró Belváros', 'Budapest', 'Minta utca 1.', 'Minta helyszín – 90 férőhelyes étterem, nyitott konyha.'),
  ('minta-duna-bisztro', 'Duna Bisztró Szentendre', 'Szentendre', 'Minta part 5.', 'Minta helyszín – teraszos étterem a Duna-parton.'),
  ('minta-tiszaparti-vendeglo', 'Tiszaparti Vendéglő', 'Szeged', 'Minta rakpart 3.', 'Minta helyszín – 120 férőhely, nyári terasz.'),
  ('minta-balaton-resort', 'Balaton Resort Siófok', 'Siófok', 'Minta sétány 10.', 'Minta helyszín – 180 szobás szálloda, beach bár.'),
  ('minta-balaton-resort', 'Balaton Resort Füred', 'Balatonfüred', 'Minta sétány 2.', 'Minta helyszín – butikhotel étteremmel.'),
  ('minta-hegyalja-kavehaz', 'Hegyalja Kávéház Eger', 'Eger', 'Minta tér 4.', 'Minta helyszín – specialty kávézó a belvárosban.'),
  ('minta-hegyalja-kavehaz', 'Hegyalja Kávéház Miskolc', 'Miskolc', 'Minta utca 12.', 'Minta helyszín – kávézó és reggeliző.'),
  ('minta-pannon-szallo', 'Pannon Szálló Győr', 'Győr', 'Minta körút 8.', 'Minta helyszín – 95 szobás városi szálloda.'),
  ('minta-pannon-szallo', 'Pannon Szálló Sopron', 'Sopron', 'Minta utca 6.', 'Minta helyszín – 60 szobás szálloda konferenciateremmel.'),
  ('minta-mecsek-gasztro', 'Mecsek Bisztró & Bár', 'Pécs', 'Minta utca 21.', 'Minta helyszín – bisztró és koktélbár.'),
  ('minta-heviz-spa-hotel', 'Hévíz Spa Hotel', 'Hévíz', 'Minta park 1.', 'Minta helyszín – 220 szobás wellness szálloda.'),
  ('minta-nagyerdo-etterem', 'Nagyerdő Étterem', 'Debrecen', 'Minta park 7.', 'Minta helyszín – étterem és 300 fős rendezvényterem.')
),
s as (
  select distinct on (name) id, name, postal_code from public.settlements
  where name in (select city from v) order by name, postal_code
)
insert into public.venues (company_id, name, address, postal_code, settlement_id, description)
select co.id, v.venue_name, v.address, s.postal_code, s.id, v.description
from v
join public.companies co on co.slug = v.company_slug
join s on s.name = v.city
where not exists (select 1 from public.venues x where x.company_id = co.id and x.name = v.venue_name);

-- állások: munkakörönként 2–3
with j (slug, venue_name, template_slug, title, wage_min, wage_max, wage_period, shifts, schedule_note, seasonal, days_ago, description) as (values
  ('minta-szakacs-duna-bisztro-belvaros', 'Duna Bisztró Belváros', 'szakacs', 'Szakács à la carte konyhára', 480000, 600000, 'monthly', '{delutan,este}'::public.shift_type[], '5 nap / hét, 2 hétvége havonta', false, 2,
   'Minta hirdetés – bemutató adat. Meleg konyhai szekcióba keresünk tapasztalt szakácsot, aki önállóan viszi a szervizt.'),
  ('minta-szakacs-tiszaparti-vendeglo', 'Tiszaparti Vendéglő', 'szakacs', 'Szakács – halételek', 430000, 520000, 'monthly', '{reggel,delutan}'::public.shift_type[], 'Kéthetes forgó beosztás', false, 5,
   'Minta hirdetés – bemutató adat. Halászlé, harcsapaprikás és napi menü – csapatba keresünk megbízható szakácsot.'),
  ('minta-szakacs-balaton-resort-siofok', 'Balaton Resort Siófok', 'szakacs', 'Bankett szakács (nyári szezon)', 520000, 650000, 'monthly', '{reggel,delutan,hetvege}'::public.shift_type[], 'Május–szeptember, szállás biztosított', true, 1,
   'Minta hirdetés – bemutató adat. 200+ fős bankettekre és svédasztalra keresünk szakácsot a szezonra.'),

  ('minta-sef-duna-bisztro-szentendre', 'Duna Bisztró Szentendre', 'sef', 'Konyhafőnök', 850000, 1100000, 'monthly', '{delutan,este}'::public.shift_type[], 'Teljes munkaidő, felelős a teljes konyháért', false, 3,
   'Minta hirdetés – bemutató adat. Szezonális étlap kialakítása, 6 fős csapat vezetése, beszerzés és food cost.'),
  ('minta-sef-heviz-spa-hotel', 'Hévíz Spa Hotel', 'sef', 'Sous chef szállodai konyhára', 700000, 850000, 'monthly', '{reggel,delutan}'::public.shift_type[], 'Egész éves, 5 nap / hét', false, 6,
   'Minta hirdetés – bemutató adat. A séf helyetteseként irányítod a reggeli és a vacsora szervizt, HACCP-felelős vagy.'),

  ('minta-kisegito-tiszaparti-vendeglo', 'Tiszaparti Vendéglő', 'konyhai-kisegito', 'Konyhai kisegítő', 2100, 2400, 'hourly', '{reggel,delutan}'::public.shift_type[], 'Heti 30–40 óra', false, 4,
   'Minta hirdetés – bemutató adat. Előkészítés, zöldségtisztítás, alapanyag-kezelés a szakácsok mellett.'),
  ('minta-kisegito-nagyerdo-etterem', 'Nagyerdő Étterem', 'konyhai-kisegito', 'Konyhai kisegítő rendezvényekre', 2200, 2500, 'hourly', '{delutan,hetvege}'::public.shift_type[], 'Főleg hétvégén, rendezvények szerint', false, 2,
   'Minta hirdetés – bemutató adat. Esküvők és céges rendezvények előkészítésében segítesz.'),
  ('minta-kisegito-balaton-resort-fured', 'Balaton Resort Füred', 'konyhai-kisegito', 'Hidegkonyhai kisegítő (szezon)', 2300, 2600, 'hourly', '{reggel}'::public.shift_type[], 'Június–augusztus', true, 7,
   'Minta hirdetés – bemutató adat. Reggeli svédasztal előkészítése és hidegtálak.'),

  ('minta-mosogato-duna-bisztro-belvaros', 'Duna Bisztró Belváros', 'mosogato', 'Mosogató', 350000, 390000, 'monthly', '{delutan,este}'::public.shift_type[], '5 nap / hét', false, 3,
   'Minta hirdetés – bemutató adat. Edények, eszközök és a konyha tisztántartása, ipari mosogatógép kezelése.'),
  ('minta-mosogato-heviz-spa-hotel', 'Hévíz Spa Hotel', 'mosogato', 'Mosogató szállodai konyhára', 360000, 400000, 'monthly', '{reggel,delutan}'::public.shift_type[], 'Forgó beosztás, ingyenes munkahelyi étkezés', false, 9,
   'Minta hirdetés – bemutató adat. Szállodai konyha és étterem mosogatója, takarítási terv szerint.'),

  ('minta-pincer-duna-bisztro-belvaros', 'Duna Bisztró Belváros', 'pincer', 'Pincér à la carte étterembe', 380000, 480000, 'monthly', '{delutan,este,hetvege}'::public.shift_type[], 'Fix bér + borravaló', false, 1,
   'Minta hirdetés – bemutató adat. Csúcsidőben 8+ asztal, borajánlás, POS-kezelés – tapasztalt pincért keresünk.'),
  ('minta-pincer-balaton-resort-siofok', 'Balaton Resort Siófok', 'pincer', 'Pincér bankettre (szezon)', 2600, 3000, 'hourly', '{delutan,este,hetvege}'::public.shift_type[], 'Május–szeptember, szállás biztosított', true, 4,
   'Minta hirdetés – bemutató adat. Esküvők és céges vacsorák felszolgálása, terítési szabályok ismerete előny.'),
  ('minta-pincer-nagyerdo-etterem', 'Nagyerdő Étterem', 'pincer', 'Felszolgáló', 360000, 440000, 'monthly', '{delutan,este}'::public.shift_type[], 'Kéthetes forgó beosztás', false, 8,
   'Minta hirdetés – bemutató adat. Családias étterembe keresünk vendégszerető felszolgálót.'),

  ('minta-pultos-mecsek-gasztro', 'Mecsek Bisztró & Bár', 'pultos', 'Bartender koktélbárba', 2500, 3000, 'hourly', '{este,ejszaka,hetvege}'::public.shift_type[], 'Csütörtöktől szombatig', false, 2,
   'Minta hirdetés – bemutató adat. Klasszikus és signature koktélok, pultnyitás és -zárás, csúcsidős tempó.'),
  ('minta-pultos-balaton-resort-siofok', 'Balaton Resort Siófok', 'pultos', 'Beach bár pultos (szezon)', 2400, 2800, 'hourly', '{delutan,este,hetvege}'::public.shift_type[], 'Június–augusztus, szállás biztosított', true, 3,
   'Minta hirdetés – bemutató adat. Fröccs, koktél, csapolás – a part legnépszerűbb bárjába.'),
  ('minta-pultos-tiszaparti-vendeglo', 'Tiszaparti Vendéglő', 'pultos', 'Pultos', 340000, 420000, 'monthly', '{delutan,este}'::public.shift_type[], '5 nap / hét', false, 10,
   'Minta hirdetés – bemutató adat. Italpult kiszolgálása, csapolás, kasszakezelés.'),

  ('minta-barista-hegyalja-eger', 'Hegyalja Kávéház Eger', 'barista', 'Barista', 2300, 2700, 'hourly', '{reggel,delutan}'::public.shift_type[], 'Hétköznap reggeli műszak', false, 1,
   'Minta hirdetés – bemutató adat. Specialty kávé, latte art, alternatív módszerek (V60, AeroPress).'),
  ('minta-barista-hegyalja-miskolc', 'Hegyalja Kávéház Miskolc', 'barista', 'Barista – részmunkaidő', 2200, 2500, 'hourly', '{reggel,hetvege}'::public.shift_type[], 'Heti 20–25 óra', false, 5,
   'Minta hirdetés – bemutató adat. Kávégép-kezelés, reggeli kiszolgálás, kassza.'),
  ('minta-barista-duna-bisztro-szentendre', 'Duna Bisztró Szentendre', 'barista', 'Barista teraszra (szezon)', 2300, 2600, 'hourly', '{reggel,delutan,hetvege}'::public.shift_type[], 'Április–október', true, 6,
   'Minta hirdetés – bemutató adat. Teraszos kávépult a Duna-parton.'),

  ('minta-recepcios-pannon-gyor', 'Pannon Szálló Győr', 'recepcios', 'Recepciós', 420000, 500000, 'monthly', '{reggel,delutan,ejszaka}'::public.shift_type[], '12 órás forgó beosztás', false, 2,
   'Minta hirdetés – bemutató adat. Check-in/check-out, PMS-rendszer, angol és német nyelvtudás.'),
  ('minta-recepcios-heviz-spa-hotel', 'Hévíz Spa Hotel', 'recepcios', 'Front office recepciós', 440000, 520000, 'monthly', '{reggel,delutan}'::public.shift_type[], 'Egész éves, 5 nap / hét', false, 4,
   'Minta hirdetés – bemutató adat. Wellness vendégek fogadása, foglaláskezelés, panaszkezelés.'),
  ('minta-recepcios-pannon-sopron', 'Pannon Szálló Sopron', 'recepcios', 'Éjszakai recepciós', 450000, 520000, 'monthly', '{ejszaka}'::public.shift_type[], 'Éjszakai műszak, 4 nap / hét', false, 7,
   'Minta hirdetés – bemutató adat. Éjszakai vendégfogadás és napi zárás.'),

  ('minta-szobaasszony-balaton-resort-siofok', 'Balaton Resort Siófok', 'szobaasszony', 'Szobaasszony (szezon)', 2100, 2400, 'hourly', '{reggel}'::public.shift_type[], 'Május–szeptember, szállás biztosított', true, 3,
   'Minta hirdetés – bemutató adat. Szobák takarítása szállodai standard szerint, napi 14–16 szoba.'),
  ('minta-szobaasszony-pannon-gyor', 'Pannon Szálló Győr', 'szobaasszony', 'Szobaasszony', 340000, 380000, 'monthly', '{reggel}'::public.shift_type[], 'Hétköznap + havi 2 hétvége', false, 5,
   'Minta hirdetés – bemutató adat. Szobák és közösségi terek rendben tartása.'),

  ('minta-hostess-mecsek-gasztro', 'Mecsek Bisztró & Bár', 'hostess', 'Hostess', 2300, 2700, 'hourly', '{este,hetvege}'::public.shift_type[], 'Csütörtöktől vasárnapig', false, 4,
   'Minta hirdetés – bemutató adat. Vendégfogadás, ültetés, foglaláskezelés, telefonos kommunikáció.'),
  ('minta-hostess-nagyerdo-etterem', 'Nagyerdő Étterem', 'hostess', 'Hostess rendezvényekre', 2400, 2800, 'hourly', '{delutan,hetvege}'::public.shift_type[], 'Rendezvények szerint', false, 6,
   'Minta hirdetés – bemutató adat. Esküvők és céges események vendégfogadása.')
)
insert into public.jobs (company_id, venue_id, template_id, slug, title, description, wage_min, wage_max, wage_period, shifts,
  schedule_note, is_seasonal, status, published_at, expires_at, start_date, created_by)
select v.company_id, v.id, t.id, j.slug, j.title, j.description, j.wage_min, j.wage_max, j.wage_period::public.wage_period, j.shifts,
  j.schedule_note, j.seasonal, 'active', now() - make_interval(days => j.days_ago), now() + interval '60 days',
  current_date + 14, 'de000000-0000-4000-8000-000000000001'
from j
join public.venues v on v.name = j.venue_name
join public.companies co on co.id = v.company_id and co.slug like 'minta-%'
join public.job_role_templates t on t.slug = j.template_slug
on conflict (slug) do update set status = 'active', expires_at = now() + interval '60 days';

-- követelmények a sablon alapértelmezései szerint
insert into public.job_requirements (job_id, competency_id, kind)
select j.id, tc.competency_id, tc.default_requirement
from public.jobs j
join public.template_competencies tc on tc.template_id = j.template_id
where j.slug like 'minta-%'
on conflict do nothing;

commit;
