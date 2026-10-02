-- JOBLANTIS seed – munkakör-sablonok és hozzájuk tartozó kompetenciák (R = kötelező, P = előny)

insert into public.job_role_templates (slug, name, description, sort_order) values
  ('szakacs', 'Szakács', 'Meleg és hideg konyhai ételkészítés recept és standard szerint.', 1),
  ('sef', 'Séf / konyhafőnök', 'A konyha szakmai és üzleti vezetése, étlap, csapat, beszerzés.', 2),
  ('konyhai-kisegito', 'Konyhai kisegítő', 'Előkészítés és kisegítés a szakácsok mellett.', 3),
  ('mosogato', 'Mosogató', 'Edények, eszközök és a konyha tisztántartása.', 4),
  ('pincer', 'Pincér', 'Vendégek kiszolgálása à la carte és rendezvényeken.', 5),
  ('pultos', 'Pultos / bartender', 'Italkészítés és pult kiszolgálás.', 6),
  ('barista', 'Barista', 'Kávékészítés és kávézói kiszolgálás.', 7),
  ('recepcios', 'Recepciós', 'Szállodai vendégfogadás, foglalás és elszámolás.', 8),
  ('szobaasszony', 'Szobaasszony', 'Szobák takarítása és rendbetétele szállodai standard szerint.', 9),
  ('hostess', 'Hostess', 'Vendégfogadás, ültetés és foglaláskezelés.', 10)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

with data (template_slug, competency_slug, req, sort_order) as (values
  ('szakacs', 'haccp', 'required', 1),
  ('szakacs', 'eu-alkalmassagi', 'required', 2),
  ('szakacs', 'keskezeles', 'required', 3),
  ('szakacs', 'adagolas-recept', 'required', 4),
  ('szakacs', 'meleg-konyha', 'required', 5),
  ('szakacs', 'hideg-konyha', 'preferred', 6),
  ('szakacs', 'a-la-carte-konyha', 'preferred', 7),
  ('szakacs', 'bankett-konyha', 'preferred', 8),
  ('szakacs', 'allergen', 'preferred', 9),
  ('szakacs', 'csucsidos-terhelhetoseg', 'preferred', 10),

  ('sef', 'haccp', 'required', 1),
  ('sef', 'eu-alkalmassagi', 'required', 2),
  ('sef', 'menutervezes', 'required', 3),
  ('sef', 'konyhai-csapatvezetes', 'required', 4),
  ('sef', 'arukeszlet-fifo', 'required', 5),
  ('sef', 'allergen', 'required', 6),
  ('sef', 'beszerzes', 'preferred', 7),
  ('sef', 'a-la-carte-konyha', 'preferred', 8),
  ('sef', 'tanyeralas', 'preferred', 9),
  ('sef', 'nyelv-angol', 'preferred', 10),

  ('konyhai-kisegito', 'haccp', 'required', 1),
  ('konyhai-kisegito', 'eu-alkalmassagi', 'required', 2),
  ('konyhai-kisegito', 'elokeszites', 'required', 3),
  ('konyhai-kisegito', 'keskezeles', 'preferred', 4),
  ('konyhai-kisegito', 'arukeszlet-fifo', 'preferred', 5),
  ('konyhai-kisegito', 'konyhai-gepek', 'preferred', 6),
  ('konyhai-kisegito', 'tisztitoszerek', 'preferred', 7),
  ('konyhai-kisegito', 'csucsidos-terhelhetoseg', 'preferred', 8),

  ('mosogato', 'eu-alkalmassagi', 'required', 1),
  ('mosogato', 'mosogatogep', 'required', 2),
  ('mosogato', 'tisztitoszerek', 'required', 3),
  ('mosogato', 'takaritasi-terv', 'required', 4),
  ('mosogato', 'haccp', 'preferred', 5),
  ('mosogato', 'csucsidos-terhelhetoseg', 'preferred', 6),

  ('pincer', 'eu-alkalmassagi', 'required', 1),
  ('pincer', 'a-la-carte-felszolgalas', 'required', 2),
  ('pincer', 'teritesi-szabalyok', 'required', 3),
  ('pincer', 'pos-kassza', 'required', 4),
  ('pincer', 'tobb-asztal', 'preferred', 5),
  ('pincer', 'bankett-felszolgalas', 'preferred', 6),
  ('pincer', 'borismeret', 'preferred', 7),
  ('pincer', 'rendelesfelvetel', 'preferred', 8),
  ('pincer', 'nyelv-angol', 'preferred', 9),
  ('pincer', 'allergen', 'preferred', 10),

  ('pultos', 'eu-alkalmassagi', 'required', 1),
  ('pultos', 'koktelkeszites', 'required', 2),
  ('pultos', 'italismeret', 'required', 3),
  ('pultos', 'pos-kassza', 'required', 4),
  ('pultos', 'felelos-italkiszolgalas', 'required', 5),
  ('pultos', 'csapolas', 'preferred', 6),
  ('pultos', 'pult-nyitas-zaras', 'preferred', 7),
  ('pultos', 'csucsidos-terhelhetoseg', 'preferred', 8),
  ('pultos', 'nyelv-angol', 'preferred', 9),

  ('barista', 'eu-alkalmassagi', 'required', 1),
  ('barista', 'kavegep', 'required', 2),
  ('barista', 'latte-art', 'required', 3),
  ('barista', 'kavegep-tisztitas', 'required', 4),
  ('barista', 'alternativ-kave', 'preferred', 5),
  ('barista', 'pos-kassza', 'preferred', 6),
  ('barista', 'haccp', 'preferred', 7),
  ('barista', 'nyelv-angol', 'preferred', 8),

  ('recepcios', 'pms', 'required', 1),
  ('recepcios', 'check-in-out', 'required', 2),
  ('recepcios', 'nyelv-angol', 'required', 3),
  ('recepcios', 'penzkezeles-szamlazas', 'required', 4),
  ('recepcios', 'foglalaskezeles', 'preferred', 5),
  ('recepcios', 'telefonos-kommunikacio', 'preferred', 6),
  ('recepcios', 'vendegregisztracio', 'preferred', 7),
  ('recepcios', 'vendegpanasz', 'preferred', 8),
  ('recepcios', 'nyelv-nemet', 'preferred', 9),

  ('szobaasszony', 'szobatakaritas', 'required', 1),
  ('szobaasszony', 'agyazas', 'required', 2),
  ('szobaasszony', 'tisztitoszerek', 'required', 3),
  ('szobaasszony', 'normaido', 'preferred', 4),
  ('szobaasszony', 'minibar', 'preferred', 5),
  ('szobaasszony', 'hibabejelentes', 'preferred', 6),
  ('szobaasszony', 'textilkezeles', 'preferred', 7),

  ('hostess', 'vendegfogadas', 'required', 1),
  ('hostess', 'asztalfoglalas', 'required', 2),
  ('hostess', 'nyelv-angol', 'required', 3),
  ('hostess', 'varolista', 'preferred', 4),
  ('hostess', 'telefonos-kommunikacio', 'preferred', 5),
  ('hostess', 'vendegpanasz', 'preferred', 6),
  ('hostess', 'nyelv-nemet', 'preferred', 7)
)
insert into public.template_competencies (template_id, competency_id, default_requirement, sort_order)
select t.id, c.id, d.req::public.requirement_kind, d.sort_order
from data d
join public.job_role_templates t on t.slug = d.template_slug
join public.competencies c on c.slug = d.competency_slug
on conflict (template_id, competency_id) do update set
  default_requirement = excluded.default_requirement, sort_order = excluded.sort_order;
