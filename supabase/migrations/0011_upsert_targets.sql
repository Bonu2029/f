-- =============================================================================
-- 0011 — make the conflict target the application uses actually inferrable
-- =============================================================================
--
-- Postgres will only use a PARTIAL unique index to resolve `ON CONFLICT (col)`
-- if the statement repeats the index's own predicate. PostgREST — and therefore
-- supabase-js `.upsert(..., { onConflict: 'vapi_call_id' })` — emits no
-- predicate, so `calls_vapi_call_id_uniq` could never satisfy it. Every such
-- upsert failed with 42P10, "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification".
--
-- The visible symptom was worse than the error: a call that could not be served
-- was written by an upsert whose error nobody read, so the webhook reported
-- success, the owner got a notification about a missed call, and `calls` stayed
-- empty. Two different outcomes — recorded and lost — looked identical.
--
-- Dropping the predicate changes nothing about what the index enforces. A
-- plain unique index on a nullable column still permits any number of NULL
-- rows, because NULLs are never equal to one another; it still refuses a
-- duplicate id; and it is inferrable. Verified against Postgres 16 rather than
-- reasoned about.
-- =============================================================================

drop index if exists public.calls_vapi_call_id_uniq;

create unique index if not exists calls_vapi_call_id_uniq
  on public.calls (vapi_call_id);

-- -----------------------------------------------------------------------------
-- Postcondition: the index exists, covers exactly vapi_call_id, and is total.
--
-- A guard rather than a comment: if a later migration reintroduces a predicate
-- here, this fails at deploy time instead of silently losing call records.
-- -----------------------------------------------------------------------------
do $$
declare
  v_predicate text;
  v_cols text;
begin
  select pg_get_expr(i.indpred, i.indrelid),
         (select string_agg(a.attname, ',' order by a.attnum)
            from pg_attribute a
           where a.attrelid = i.indrelid
             and a.attnum = any (i.indkey))
    into v_predicate, v_cols
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
   where c.relname = 'calls_vapi_call_id_uniq';

  if v_cols is null then
    raise exception 'calls_vapi_call_id_uniq is missing; upserts on calls would fail with 42P10';
  end if;

  if v_cols <> 'vapi_call_id' then
    raise exception 'calls_vapi_call_id_uniq covers (%), expected vapi_call_id', v_cols;
  end if;

  if v_predicate is not null then
    raise exception
      'calls_vapi_call_id_uniq is partial (%); ON CONFLICT (vapi_call_id) cannot infer it',
      v_predicate;
  end if;
end $$;
