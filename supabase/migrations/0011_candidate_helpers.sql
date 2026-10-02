-- JOBLANTIS – jelölti segédfüggvények (2. fázis)

-- A jelölt számára releváns kompetenciák: a keresett munkakörök kompetenciái és a meglévő készségei.
create or replace function public.candidate_relevant_competencies()
returns table (id integer, name text, category text)
language sql stable security invoker set search_path = public as $$
  select distinct c.id, c.name, c.category
  from public.competencies c
  where exists (
      select 1 from public.template_competencies tc
      join public.candidate_target_roles r on r.template_id = tc.template_id
      where tc.competency_id = c.id and r.candidate_id = auth.uid()
    )
    or exists (select 1 from public.candidate_skills s where s.competency_id = c.id and s.candidate_id = auth.uid())
  order by c.category, c.name
$$;

grant execute on function public.candidate_relevant_competencies to authenticated;
