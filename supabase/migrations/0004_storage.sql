-- =============================================================================
-- 0004_storage.sql — Supabase Storage buckets and access policies
--
-- Object key convention for every tenant bucket:
--     <organization_id>/<rest-of-path>
-- The first path segment is the organisation id, and the policies below compare
-- it against the caller's membership. A user cannot list or download an object
-- whose first segment is an organisation they do not belong to.
--
-- All three buckets are PRIVATE. Files reach the browser only through
-- short-lived signed URLs minted by server code after an authorisation check.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'knowledge',
    'knowledge',
    false,
    26214400, -- 25 MB
    array[
      'application/pdf',
      'text/plain',
      'text/csv',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'lead-photos',
    'lead-photos',
    false,
    15728640, -- 15 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  ),
  (
    'avatars',
    'avatars',
    false,
    2097152, -- 2 MB
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------
-- Object keys are user-influenced, so parse the leading segment defensively:
-- a malformed key yields NULL (and therefore no access) instead of raising.
create or replace function public.safe_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;
grant execute on function public.safe_uuid(text) to anon, authenticated, service_role;

drop policy if exists knowledge_read on storage.objects;
drop policy if exists knowledge_write on storage.objects;
drop policy if exists knowledge_delete on storage.objects;
drop policy if exists lead_photos_read on storage.objects;
drop policy if exists avatars_read on storage.objects;
drop policy if exists avatars_write on storage.objects;

-- Knowledge documents: readable by any member, writable by admins.
create policy knowledge_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'knowledge'
    and public.is_org_member(public.safe_uuid(split_part(name, '/', 1)))
  );

create policy knowledge_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'knowledge'
    and public.has_org_role(public.safe_uuid(split_part(name, '/', 1)), 'admin')
  );

create policy knowledge_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'knowledge'
    and public.has_org_role(public.safe_uuid(split_part(name, '/', 1)), 'admin')
  );

-- Lead photos: members read. Writes come only from the public upload endpoint,
-- which validates a signed one-time token server-side and uses the service role,
-- so there is deliberately no client INSERT policy here.
create policy lead_photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lead-photos'
    and public.is_org_member(public.safe_uuid(split_part(name, '/', 1)))
  );

-- Avatars are keyed by user id rather than organisation.
create policy avatars_read on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

create policy avatars_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);
