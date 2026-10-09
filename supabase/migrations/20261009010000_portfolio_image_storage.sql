insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-images',
  'portfolio-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Portfolio admins can upload portfolio images" on storage.objects;
drop policy if exists "Portfolio admins can update their portfolio images" on storage.objects;
drop policy if exists "Portfolio admins can delete their portfolio images" on storage.objects;

create policy "Portfolio admins can upload portfolio images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Portfolio admins can update their portfolio images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'portfolio-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'portfolio-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Portfolio admins can delete their portfolio images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'portfolio-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
