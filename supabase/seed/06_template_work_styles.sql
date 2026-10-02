-- JOBLANTIS seed – munkakörönkénti munkastílus-célprofil (0–100). Kiegészítő szempont, legfeljebb 20% súllyal.
-- Az adminban később szerkeszthető; az illesztés a jelölt profiljától vett átlagos eltérést használja.

with data (template_slug, dimension_slug, target) as (values
  ('szakacs', 'csapatmunka', 70), ('szakacs', 'stressztures', 80), ('szakacs', 'rugalmassag', 55),
  ('szakacs', 'vendegfokusz', 30), ('szakacs', 'precizitas', 80), ('szakacs', 'kezdemenyezes', 55),

  ('sef', 'csapatmunka', 65), ('sef', 'stressztures', 85), ('sef', 'rugalmassag', 55),
  ('sef', 'vendegfokusz', 45), ('sef', 'precizitas', 85), ('sef', 'kezdemenyezes', 85),

  ('konyhai-kisegito', 'csapatmunka', 70), ('konyhai-kisegito', 'stressztures', 65), ('konyhai-kisegito', 'rugalmassag', 60),
  ('konyhai-kisegito', 'vendegfokusz', 25), ('konyhai-kisegito', 'precizitas', 65), ('konyhai-kisegito', 'kezdemenyezes', 40),

  ('mosogato', 'csapatmunka', 60), ('mosogato', 'stressztures', 65), ('mosogato', 'rugalmassag', 60),
  ('mosogato', 'vendegfokusz', 15), ('mosogato', 'precizitas', 60), ('mosogato', 'kezdemenyezes', 35),

  ('pincer', 'csapatmunka', 75), ('pincer', 'stressztures', 80), ('pincer', 'rugalmassag', 65),
  ('pincer', 'vendegfokusz', 90), ('pincer', 'precizitas', 60), ('pincer', 'kezdemenyezes', 55),

  ('pultos', 'csapatmunka', 70), ('pultos', 'stressztures', 80), ('pultos', 'rugalmassag', 60),
  ('pultos', 'vendegfokusz', 85), ('pultos', 'precizitas', 60), ('pultos', 'kezdemenyezes', 60),

  ('barista', 'csapatmunka', 65), ('barista', 'stressztures', 70), ('barista', 'rugalmassag', 55),
  ('barista', 'vendegfokusz', 85), ('barista', 'precizitas', 75), ('barista', 'kezdemenyezes', 55),

  ('recepcios', 'csapatmunka', 65), ('recepcios', 'stressztures', 75), ('recepcios', 'rugalmassag', 55),
  ('recepcios', 'vendegfokusz', 90), ('recepcios', 'precizitas', 80), ('recepcios', 'kezdemenyezes', 60),

  ('szobaasszony', 'csapatmunka', 50), ('szobaasszony', 'stressztures', 60), ('szobaasszony', 'rugalmassag', 55),
  ('szobaasszony', 'vendegfokusz', 30), ('szobaasszony', 'precizitas', 85), ('szobaasszony', 'kezdemenyezes', 45),

  ('hostess', 'csapatmunka', 70), ('hostess', 'stressztures', 70), ('hostess', 'rugalmassag', 60),
  ('hostess', 'vendegfokusz', 95), ('hostess', 'precizitas', 65), ('hostess', 'kezdemenyezes', 55)
)
insert into public.template_work_styles (template_id, dimension_id, target)
select t.id, w.id, d.target::smallint
from data d
join public.job_role_templates t on t.slug = d.template_slug
join public.work_style_dimensions w on w.slug = d.dimension_slug
on conflict (template_id, dimension_id) do update set target = excluded.target;
