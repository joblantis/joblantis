-- JOBLANTIS – nyilvános állaskeresés szűrőkkel és légvonalbeli távolsággal.
-- security invoker: a hívó jogaival fut, így az RLS (csak aktív, le nem járt állás) érvényes marad.

create or replace function public.search_public_jobs(
  p_template_id integer default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_max_km double precision default null,
  p_wage_period public.wage_period default null,
  p_wage_min integer default null,
  p_seasonal boolean default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (job_id uuid, distance_km double precision)
language sql stable security invoker set search_path = public as $$
  select j.id,
    case when p_lat is null or p_lng is null then null
         else public.distance_km(p_lat, p_lng, s.lat, s.lng) end as distance_km
  from public.jobs j
  join public.venues v on v.id = j.venue_id
  join public.settlements s on s.id = v.settlement_id
  where j.status = 'active' and j.expires_at > now()
    and (p_template_id is null or j.template_id = p_template_id)
    and (p_seasonal is null or j.is_seasonal = p_seasonal)
    and (p_wage_min is null or (j.wage_period = coalesce(p_wage_period, j.wage_period)
         and coalesce(j.wage_max, j.wage_min) >= p_wage_min))
    and (p_max_km is null or p_lat is null or p_lng is null
         or public.distance_km(p_lat, p_lng, s.lat, s.lng) <= p_max_km)
  order by
    case when p_lat is null or p_lng is null then null else public.distance_km(p_lat, p_lng, s.lat, s.lng) end asc nulls last,
    j.published_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

grant execute on function public.search_public_jobs to anon, authenticated;
