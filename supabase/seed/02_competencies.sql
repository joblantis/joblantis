-- JOBLANTIS seed – ellenőrizhető kompetenciák

insert into public.competencies (slug, name, category, has_language_level, description) values
  -- általános / higiénia
  ('haccp', 'HACCP-ismeret', 'higiénia', false, 'Élelmiszer-biztonsági szabályok és dokumentáció ismerete'),
  ('eu-alkalmassagi', 'Érvényes egészségügyi alkalmassági', 'dokumentum', false, 'Érvényes munkaköri egészségügyi alkalmassági igazolás'),
  ('allergen', 'Allergénismeret', 'higiénia', false, 'A 14 kötelezően jelölendő allergén ismerete és kezelése'),
  ('csucsidos-terhelhetoseg', 'Csúcsidős terhelhetőség', 'munkavégzés', false, 'Tempó és minőség tartása csúcsidőben'),
  ('pos-kassza', 'POS/kasszakezelés', 'értékesítés', false, 'Rendelésrögzítés, számlázás, fizetés, zárás'),
  ('vendegpanasz', 'Vendégpanasz-kezelés', 'vendégkapcsolat', false, 'Panaszok higgadt, megoldásközpontú kezelése'),
  ('telefonos-kommunikacio', 'Telefonos és e-mailes vendégkommunikáció', 'vendégkapcsolat', false, null),
  ('nyelv-angol', 'Angol nyelvtudás', 'nyelv', true, 'Szint: A1–C2'),
  ('nyelv-nemet', 'Német nyelvtudás', 'nyelv', true, 'Szint: A1–C2'),
  -- konyha
  ('keskezeles', 'Késkezelés és alapvágások', 'konyha', false, null),
  ('adagolas-recept', 'Adagolás és receptkövetés', 'konyha', false, null),
  ('meleg-konyha', 'Meleg konyhai alaptechnikák', 'konyha', false, 'Sütés, főzés, párolás, mártások'),
  ('hideg-konyha', 'Hideg konyha és mise en place', 'konyha', false, null),
  ('a-la-carte-konyha', 'À la carte konyhai tapasztalat', 'konyha', false, null),
  ('bankett-konyha', 'Bankett és nagy tételű főzés', 'konyha', false, null),
  ('tanyeralas', 'Tányérra rendezés (plating)', 'konyha', false, null),
  ('arukeszlet-fifo', 'Árukezelés, FIFO, raktározás', 'konyha', false, null),
  ('konyhai-gepek', 'Konyhai gépek kezelése', 'konyha', false, 'Kombi pároló, szeletelő, robotgép'),
  ('elokeszites', 'Alapanyag-előkészítés', 'konyha', false, 'Zöldség- és hústisztítás, porciózás'),
  ('menutervezes', 'Menütervezés és ételköltség-kalkuláció', 'vezetés', false, null),
  ('konyhai-csapatvezetes', 'Konyhai csapatvezetés, beosztáskészítés', 'vezetés', false, null),
  ('beszerzes', 'Beszerzés és beszállítókezelés', 'vezetés', false, null),
  -- mosogatás / takarítás
  ('mosogatogep', 'Ipari mosogatógép kezelése', 'mosogatás', false, null),
  ('tisztitoszerek', 'Tisztítószerek biztonságos használata', 'takarítás', false, null),
  ('takaritasi-terv', 'Takarítási terv szerinti munkavégzés', 'takarítás', false, null),
  -- felszolgálás
  ('a-la-carte-felszolgalas', 'À la carte felszolgálás', 'felszolgálás', false, null),
  ('bankett-felszolgalas', 'Bankett felszolgálás', 'felszolgálás', false, null),
  ('tobb-asztal', 'Több asztal egyidejű kiszolgálása', 'felszolgálás', false, null),
  ('teritesi-szabalyok', 'Terítési és felszolgálási szabályok', 'felszolgálás', false, null),
  ('borismeret', 'Borismeret és borajánlás', 'felszolgálás', false, null),
  ('rendelesfelvetel', 'Rendelésfelvétel és ajánlás', 'felszolgálás', false, null),
  -- pult
  ('koktelkeszites', 'Koktélkészítés', 'pult', false, null),
  ('italismeret', 'Italismeret', 'pult', false, 'Párlatok, likőrök, sörök'),
  ('csapolas', 'Sörcsapolás és csapolóberendezés', 'pult', false, null),
  ('pult-nyitas-zaras', 'Pult nyitása/zárása, italleltár', 'pult', false, null),
  ('felelos-italkiszolgalas', 'Felelős italkiszolgálás', 'pult', false, 'Kiskorúak, ittas vendégek kezelése'),
  -- barista
  ('kavegep', 'Kávégép-kezelés és -beállítás', 'barista', false, 'Őrlés, extrakció, eszpresszó'),
  ('latte-art', 'Tejhabosítás és latte art', 'barista', false, null),
  ('alternativ-kave', 'Alternatív kávékészítés', 'barista', false, 'Filter, V60, Chemex, AeroPress'),
  ('kavegep-tisztitas', 'Kávégép tisztítása és karbantartása', 'barista', false, null),
  -- recepció
  ('pms', 'Szállodai PMS-rendszer ismerete', 'recepció', false, 'Pl. Opera, Protel'),
  ('check-in-out', 'Check-in / check-out folyamat', 'recepció', false, null),
  ('foglalaskezeles', 'Foglaláskezelés, channel manager', 'recepció', false, null),
  ('penzkezeles-szamlazas', 'Pénzkezelés, számlázás, napi zárás', 'recepció', false, null),
  ('vendegregisztracio', 'Vendégregisztráció (VIZA)', 'recepció', false, null),
  -- szobaasszony
  ('szobatakaritas', 'Szobatakarítás szállodai standard szerint', 'housekeeping', false, null),
  ('agyazas', 'Ágyazás és textilcsere standard szerint', 'housekeeping', false, null),
  ('normaido', 'Normaidő tartása', 'housekeeping', false, 'Szobaszám / műszak'),
  ('minibar', 'Minibár-feltöltés és leltár', 'housekeeping', false, null),
  ('hibabejelentes', 'Hibák és talált tárgyak jelentése', 'housekeeping', false, null),
  ('textilkezeles', 'Textil- és mosodai kezelés', 'housekeeping', false, null),
  -- hostess
  ('vendegfogadas', 'Vendégfogadás és ültetés', 'hostess', false, null),
  ('asztalfoglalas', 'Asztalfoglaló rendszer kezelése', 'hostess', false, null),
  ('varolista', 'Várólista és asztalforgás koordinálása', 'hostess', false, null)
on conflict (slug) do update set
  name = excluded.name, category = excluded.category,
  has_language_level = excluded.has_language_level, description = excluded.description;
