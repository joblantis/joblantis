-- JOBLANTIS seed – munkastílus-dimenziók és helyzetkártyák (kiegészítő, max. 20% súly a rangsorban)

insert into public.work_style_dimensions (slug, name, low_label, high_label, sort_order) values
  ('csapatmunka', 'Csapatmunka', 'Önálló munkavégzés', 'Csapatban dolgozik', 1),
  ('stressztures', 'Stressztűrés', 'Nyugodt tempót igényel', 'Nyomás alatt is nyugodt', 2),
  ('rugalmassag', 'Rugalmasság', 'Kiszámítható beosztás', 'Rugalmasan beugrik', 3),
  ('vendegfokusz', 'Vendégfókusz', 'Háttérmunka', 'Vendég előtt kibontakozik', 4),
  ('precizitas', 'Precizitás', 'Gyors, laza', 'Pontos, szabálykövető', 5),
  ('kezdemenyezes', 'Kezdeményezés', 'Utasítás szerint dolgozik', 'Javasol és kezdeményez', 6)
on conflict (slug) do update set
  name = excluded.name, low_label = excluded.low_label, high_label = excluded.high_label, sort_order = excluded.sort_order;

with data (dimension_slug, statement, polarity, sort_order) as (values
  ('csapatmunka', 'Inkább csapatban dolgozom, mint egyedül', 1, 1),
  ('stressztures', 'Stresszben is nyugodt maradok', 1, 2),
  ('rugalmassag', 'Szívesen beugrom, ha rövid határidővel kell', 1, 3),
  ('vendegfokusz', 'Feltölt, ha elégedett vendégeket látok', 1, 4),
  ('precizitas', 'Szeretem, ha minden a helyén van, és szabály szerint megy', 1, 5),
  ('kezdemenyezes', 'Ha jobb megoldást látok, szólok és javaslom', 1, 6),
  ('csapatmunka', 'Akkor vagyok a legjobb, ha egyedül, önállóan dolgozhatok', -1, 7),
  ('stressztures', 'Ha elcsúszik a szerviz, nem esek pánikba, hanem sorrendet állítok', 1, 8),
  ('rugalmassag', 'Fontos nekem a fix, előre tudható beosztás', -1, 9),
  ('kezdemenyezes', 'Szeretem, ha pontosan megmondják, mi a feladatom', -1, 10)
)
insert into public.swipe_cards (template_id, kind, statement, dimension_id, polarity, sort_order)
select null, 'work_style', d.statement, w.id, d.polarity::smallint, d.sort_order
from data d
join public.work_style_dimensions w on w.slug = d.dimension_slug
on conflict (coalesce(template_id, 0), statement) do update set
  dimension_id = excluded.dimension_id, polarity = excluded.polarity, sort_order = excluded.sort_order;
