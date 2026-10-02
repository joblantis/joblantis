-- create_company: az unaccent az extensions sémában van, ezért az is kell a search_path-ba
alter function public.create_company(text, text, text) set search_path = public, extensions;
