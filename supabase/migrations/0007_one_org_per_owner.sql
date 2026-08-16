-- =============================================================================
-- 0007_one_org_per_owner.sql — one owned organisation per user
--
-- `/onboarding/start` creates the organisation on first visit. That page is
-- reachable by refresh, by the back button, and by a double submit, so two
-- requests can both find no organisation and both create one. The result is a
-- user owning two businesses with their calls, settings and subscription split
-- across them — silently, and painfully to unpick afterwards.
--
-- The application checks before inserting, but a check-then-insert is not a
-- guarantee: two concurrent requests can both pass the check. This index is the
-- guarantee. The application handles the violation by returning the winner's
-- row, so the loser of the race still gets a working page.
--
-- Note what this does NOT restrict: a user may still be a *member* of any
-- number of organisations. Team invitations create rows in
-- `organization_members`, not ownership. This constrains only who is recorded
-- as `owner_user_id`, which is exactly one business per person — the product's
-- model today.
--
-- Transferring ownership stays possible: `owner_user_id` can be updated to any
-- user who does not already own an organisation.
-- =============================================================================

-- Collapse any duplicates that predate this index, keeping the oldest — it is
-- the one whose id the rest of the tenant's rows already reference.
--
-- Deleting is safe here only because a duplicate can only have been created by
-- the race above, seconds apart, before the user did anything with it. A
-- duplicate holding real data would be a different problem, so refuse to guess:
-- report it and let a human decide.
do $$
declare
  risky record;
begin
  for risky in
    select o.id, o.owner_user_id, o.name
      from public.organizations o
     where o.id not in (
             select distinct on (owner_user_id) id
               from public.organizations
              order by owner_user_id, created_at
           )
       and (
             exists (select 1 from public.calls        c where c.organization_id = o.id)
          or exists (select 1 from public.leads        l where l.organization_id = o.id)
          or exists (select 1 from public.appointments a where a.organization_id = o.id)
           )
  loop
    raise exception
      'Organisation % (%) is a duplicate for owner % but holds calls, leads or appointments. '
      'Merge it by hand before applying this migration.',
      risky.name, risky.id, risky.owner_user_id;
  end loop;
end $$;

delete from public.organizations o
 where o.id not in (
   select distinct on (owner_user_id) id
     from public.organizations
    order by owner_user_id, created_at
 );

create unique index if not exists organizations_one_per_owner
  on public.organizations (owner_user_id);
