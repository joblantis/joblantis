-- JOBLANTIS – privát Storage bucketek; a fájlok aláírt URL-lel jelennek meg.
-- Útvonal-konvenció:
--   venue-photos/{company_id}/{venue_id}/{fájl}
--   company-logos/{company_id}/{fájl}
--   candidate-media/{user_id}/{album_id}/{fájl}
--   intro-videos/{user_id}/{fájl}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('venue-photos', 'venue-photos', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('company-logos', 'company-logos', false, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('candidate-media', 'candidate-media', false, 104857600, array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']),
  ('intro-videos', 'intro-videos', false, 104857600, array['video/mp4','video/webm','video/quicktime','image/jpeg','image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cégfájlok: csak a cég tagjai
create policy "company files read" on storage.objects for select to authenticated
  using (bucket_id in ('venue-photos','company-logos')
    and (public.is_company_member(public.try_uuid((storage.foldername(name))[1])) or public.is_admin()));
create policy "company files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('venue-photos','company-logos')
    and public.is_company_member(public.try_uuid((storage.foldername(name))[1])));
create policy "company files update" on storage.objects for update to authenticated
  using (bucket_id in ('venue-photos','company-logos')
    and public.is_company_member(public.try_uuid((storage.foldername(name))[1])));
create policy "company files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('venue-photos','company-logos')
    and public.is_company_member(public.try_uuid((storage.foldername(name))[1])));

-- Jelölt fájlok: a jelölt a saját mappáját kezeli, a munkáltató csak jelentkezés után olvashat
create policy "candidate files read" on storage.objects for select to authenticated
  using (bucket_id in ('candidate-media','intro-videos')
    and (
      public.try_uuid((storage.foldername(name))[1]) = auth.uid()
      or public.employer_can_view_candidate(public.try_uuid((storage.foldername(name))[1]))
      or public.is_admin()
    ));
create policy "candidate files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('candidate-media','intro-videos')
    and public.try_uuid((storage.foldername(name))[1]) = auth.uid());
create policy "candidate files update" on storage.objects for update to authenticated
  using (bucket_id in ('candidate-media','intro-videos')
    and public.try_uuid((storage.foldername(name))[1]) = auth.uid());
create policy "candidate files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('candidate-media','intro-videos')
    and public.try_uuid((storage.foldername(name))[1]) = auth.uid());
