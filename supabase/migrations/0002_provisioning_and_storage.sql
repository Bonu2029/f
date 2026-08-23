-- ============================================================================
-- ServiceTag — account provisioning and storage
-- ============================================================================

-- ---------------------------------------------------------------------------
-- provision_business
--
-- Called once, right after sign-up, by the newly created (authenticated) user.
-- Creates the business, the owner's profile and a subscription row in a single
-- transaction. Refuses to run twice for the same user.
-- ---------------------------------------------------------------------------
create or replace function provision_business(
  business_name text,
  owner_name text,
  owner_email text,
  business_type text,
  phone text default null,
  website text default null,
  plan text default 'starter',
  plan_tag_limit integer default 90
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_business_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from profiles where id = uid) then
    raise exception 'Account already provisioned';
  end if;

  insert into businesses (name, business_type, phone, email, website)
  values (
    left(trim(business_name), 160),
    left(trim(business_type), 60),
    nullif(left(trim(coalesce(phone, '')), 40), ''),
    lower(trim(owner_email)),
    nullif(left(trim(coalesce(website, '')), 200), '')
  )
  returning id into new_business_id;

  insert into profiles (id, business_id, full_name, email, phone)
  values (
    uid,
    new_business_id,
    left(trim(owner_name), 120),
    lower(trim(owner_email)),
    nullif(left(trim(coalesce(phone, '')), 40), '')
  );

  insert into subscriptions (business_id, plan_id, status, tag_limit)
  values (new_business_id, plan, 'trialing', plan_tag_limit);

  return new_business_id;
end;
$$;

grant execute on function provision_business(
  text, text, text, text, text, text, text, integer
) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
--
-- business-logos      public read  — logos appear on customer tag pages
-- request-photos      private      — photos attached to service requests
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('business-logos', 'business-logos', true, 2097152,
   array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('request-photos', 'request-photos', false, 8388608,
   array['image/png', 'image/jpeg', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- A business may manage only files under its own folder: <business_id>/...
create policy business_logos_read on storage.objects
  for select using (bucket_id = 'business-logos');

create policy business_logos_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = current_business_id()::text
  );

create policy business_logos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = current_business_id()::text
  );

create policy business_logos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = current_business_id()::text
  );

-- Anyone tapping a tag may attach a photo to their request. Nobody can list or
-- read the bucket: a business can only read an object that one of its own
-- service requests actually references, and reads it through a signed URL.
create policy request_photos_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'request-photos');

create policy request_photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'request-photos'
    and exists (
      select 1 from service_requests sr
      where sr.photo_url = storage.objects.name
        and sr.business_id = current_business_id()
    )
  );
