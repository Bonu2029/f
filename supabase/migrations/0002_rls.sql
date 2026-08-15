-- =============================================================================
-- 0002_rls.sql — Row Level Security
--
-- Threat model: an authenticated user holding a valid Supabase JWT must not be
-- able to read or write ANY row belonging to an organisation they are not a
-- member of, even by crafting raw PostgREST requests against the anon endpoint.
--
-- Strategy
--   * RLS is enabled and FORCED on every tenant table.
--   * Membership is resolved through `public.is_org_member()`, a SECURITY
--     DEFINER function. Using a function (rather than an inline subquery on
--     organization_members) avoids infinite policy recursion and keeps the
--     membership check in one auditable place.
--   * Writes that must stay authoritative (calls, usage, subscriptions,
--     founder claims, webhook events) are readable by members but writable only
--     by the service role, which bypasses RLS. The application never ships the
--     service-role key to the browser.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Membership helpers
-- -----------------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.current_org_role(org uuid)
returns member_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.organization_members m
  where m.organization_id = org and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.has_org_role(org uuid, minimum member_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_org_role(org)
    when 'owner' then 3
    when 'admin' then 2
    when 'staff' then 1
    else 0
  end >= case minimum
    when 'owner' then 3
    when 'admin' then 2
    when 'staff' then 1
    else 0
  end;
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.current_org_role(uuid) from public;
revoke all on function public.has_org_role(uuid, member_role) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.current_org_role(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, member_role) to authenticated;

-- -----------------------------------------------------------------------------
-- Table privileges
--
-- RLS decides WHICH ROWS a role may touch; GRANT decides whether it may touch
-- the table at all. Supabase applies default grants to `authenticated`, but we
-- state them explicitly so the schema is correct on any PostgreSQL instance and
-- so the privilege surface is auditable in one place rather than inherited.
--
-- `anon` deliberately gets nothing: signed-out visitors reach the database only
-- through the public founder-slot counter function.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','organization_members','business_profiles','services','faqs',
    'business_policies','service_areas','ai_agents','ai_rules','knowledge_documents',
    'knowledge_chunks','phone_numbers','calendar_connections','oauth_states',
    'availability_rules','availability_settings','calls','leads','lead_photos',
    'upload_tokens','call_transcript_messages','appointments','sms_messages','usage_ledger',
    'subscriptions','founder_claims','webhook_events','audit_logs','notifications',
    'notification_preferences','team_invites','training_messages','error_events'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Enable + force RLS everywhere
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','organization_members','business_profiles','services','faqs',
    'business_policies','service_areas','ai_agents','ai_rules','knowledge_documents',
    'knowledge_chunks','phone_numbers','calendar_connections','oauth_states',
    'availability_rules','availability_settings','calls','leads','lead_photos',
    'upload_tokens','call_transcript_messages','appointments','sms_messages','usage_ledger',
    'subscriptions','founder_claims','webhook_events','audit_logs','notifications',
    'notification_preferences','team_invites','training_messages','error_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Drop any pre-existing policies so this migration is re-runnable.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Teammates may see each other's basic profile (needed for the Team page).
create policy profiles_select_teammates on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.organization_members me
      join public.organization_members them
        on them.organization_id = me.organization_id
      where me.user_id = auth.uid() and them.user_id = public.profiles.id
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

-- A user may create an organisation only with themselves as owner.
create policy organizations_insert_own on public.organizations
  for insert to authenticated
  with check (owner_user_id = auth.uid());

create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (public.has_org_role(id, 'admin'))
  with check (public.has_org_role(id, 'admin'));

create policy organizations_delete_owner on public.organizations
  for delete to authenticated
  using (public.has_org_role(id, 'owner'));

-- -----------------------------------------------------------------------------
-- organization_members
-- -----------------------------------------------------------------------------
create policy org_members_select on public.organization_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));

-- Bootstrap: the organisation owner inserts their own owner row. All other
-- membership changes go through server-side invite acceptance (service role).
create policy org_members_insert_bootstrap on public.organization_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_user_id = auth.uid()
    )
  );

create policy org_members_update_admin on public.organization_members
  for update to authenticated
  using (public.has_org_role(organization_id, 'admin'))
  with check (public.has_org_role(organization_id, 'admin'));

create policy org_members_delete_admin on public.organization_members
  for delete to authenticated
  using (public.has_org_role(organization_id, 'admin'));

-- -----------------------------------------------------------------------------
-- Generic tenant tables: members read, admins write
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'business_profiles','services','faqs','business_policies','service_areas',
    'ai_agents','ai_rules','availability_rules','availability_settings',
    'notification_preferences'
  ]
  loop
    execute format($f$
      create policy %1$s_select on public.%1$I
        for select to authenticated using (public.is_org_member(organization_id));
    $f$, t);
    execute format($f$
      create policy %1$s_insert on public.%1$I
        for insert to authenticated with check (public.has_org_role(organization_id, 'admin'));
    $f$, t);
    execute format($f$
      create policy %1$s_update on public.%1$I
        for update to authenticated
        using (public.has_org_role(organization_id, 'admin'))
        with check (public.has_org_role(organization_id, 'admin'));
    $f$, t);
    execute format($f$
      create policy %1$s_delete on public.%1$I
        for delete to authenticated using (public.has_org_role(organization_id, 'admin'));
    $f$, t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Operational tables: any member reads and writes (staff work the queue)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['leads','appointments','notifications'] loop
    execute format($f$
      create policy %1$s_select on public.%1$I
        for select to authenticated using (public.is_org_member(organization_id));
    $f$, t);
    execute format($f$
      create policy %1$s_insert on public.%1$I
        for insert to authenticated with check (public.is_org_member(organization_id));
    $f$, t);
    execute format($f$
      create policy %1$s_update on public.%1$I
        for update to authenticated
        using (public.is_org_member(organization_id))
        with check (public.is_org_member(organization_id));
    $f$, t);
  end loop;
end $$;

create policy leads_delete on public.leads
  for delete to authenticated using (public.has_org_role(organization_id, 'admin'));
create policy appointments_delete on public.appointments
  for delete to authenticated using (public.has_org_role(organization_id, 'admin'));

-- -----------------------------------------------------------------------------
-- Read-only-to-clients tables (written exclusively by trusted server code)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'calls','call_transcript_messages','sms_messages','usage_ledger',
    'lead_photos','training_messages'
  ]
  loop
    execute format($f$
      create policy %1$s_select on public.%1$I
        for select to authenticated using (public.is_org_member(organization_id));
    $f$, t);
  end loop;
end $$;

-- Subscriptions and audit logs are billing/compliance records: owners and
-- admins can read them; nobody can write from the client.
create policy subscriptions_select on public.subscriptions
  for select to authenticated using (public.is_org_member(organization_id));

create policy audit_logs_select on public.audit_logs
  for select to authenticated using (public.has_org_role(organization_id, 'admin'));

create policy founder_claims_select on public.founder_claims
  for select to authenticated using (public.is_org_member(organization_id));

-- -----------------------------------------------------------------------------
-- Secrets: never readable by any client role, even a member
-- -----------------------------------------------------------------------------
-- calendar_connections holds encrypted OAuth tokens. Clients get a redacted
-- view instead of the table (see calendar_connection_status below).
create policy calendar_connections_none on public.calendar_connections
  for select to authenticated using (false);

create policy oauth_states_none on public.oauth_states
  for select to authenticated using (false);

create policy upload_tokens_none on public.upload_tokens
  for select to authenticated using (false);

create policy team_invites_admin_select on public.team_invites
  for select to authenticated using (public.has_org_role(organization_id, 'admin'));

-- webhook_events and error_events are platform-level: service role only.
create policy webhook_events_none on public.webhook_events
  for select to authenticated using (false);

create policy error_events_none on public.error_events
  for select to authenticated using (false);

-- -----------------------------------------------------------------------------
-- Knowledge base — reads are always organisation-scoped. RAG retrieval runs
-- through these same policies so one tenant can never retrieve another's
-- documents.
-- -----------------------------------------------------------------------------
create policy knowledge_documents_select on public.knowledge_documents
  for select to authenticated using (public.is_org_member(organization_id));
create policy knowledge_documents_insert on public.knowledge_documents
  for insert to authenticated with check (public.has_org_role(organization_id, 'admin'));
create policy knowledge_documents_delete on public.knowledge_documents
  for delete to authenticated using (public.has_org_role(organization_id, 'admin'));

create policy knowledge_chunks_select on public.knowledge_chunks
  for select to authenticated using (public.is_org_member(organization_id));

-- -----------------------------------------------------------------------------
-- phone_numbers — members read; provisioning happens server-side
-- -----------------------------------------------------------------------------
create policy phone_numbers_select on public.phone_numbers
  for select to authenticated using (public.is_org_member(organization_id));
create policy phone_numbers_update on public.phone_numbers
  for update to authenticated
  using (public.has_org_role(organization_id, 'admin'))
  with check (public.has_org_role(organization_id, 'admin'));

-- -----------------------------------------------------------------------------
-- Redacted calendar connection status for the dashboard.
-- The base table is unreadable by any client role because it holds encrypted
-- OAuth tokens. This SECURITY DEFINER function re-checks membership itself and
-- returns only non-secret fields — the tokens never leave the database.
-- -----------------------------------------------------------------------------
create or replace function public.get_calendar_status(org uuid)
returns table (
  provider text,
  account_email text,
  selected_calendar_id text,
  active boolean,
  last_error text,
  has_refresh_token boolean,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.provider, c.account_email, c.selected_calendar_id, c.active, c.last_error,
         (c.encrypted_refresh_token is not null), c.expires_at
  from public.calendar_connections c
  where c.organization_id = org
    and public.is_org_member(org);
$$;

revoke all on function public.get_calendar_status(uuid) from public;
grant execute on function public.get_calendar_status(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Public founder-slot counter — the marketing site needs a live number without
-- exposing any claim rows. Callable anonymously; returns only an integer.
-- -----------------------------------------------------------------------------
create or replace function public.founder_slots_remaining()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    50 - (
      select count(*)::int from public.founder_claims
      where status in ('reserved', 'active')
        and (status = 'active' or expires_at is null or expires_at > now())
    )
  );
$$;

revoke all on function public.founder_slots_remaining() from public;
grant execute on function public.founder_slots_remaining() to anon, authenticated;
