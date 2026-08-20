-- =============================================================================
-- 0012 — an empty string is not a transcript
-- =============================================================================
--
-- Vapi sends `""` rather than omitting a field when a call produced nothing —
-- which is what happens when the caller's microphone never publishes audio. An
-- empty string satisfies `??`, so the reader stored it as a value instead of
-- falling through to the alternative rendering. The rows it produced say "this
-- call has a transcript, and the transcript is nothing", which is not what
-- happened and is not distinguishable in the UI from a call still being
-- processed.
--
-- The reader now normalises at the boundary. This cleans up what it already
-- wrote. Only literal empty and whitespace-only values are touched: anything a
-- person could read is left exactly as it is.
--
-- Deliberately NOT changing `result` on existing rows. Several are recorded as
-- `completed` for calls that failed technically, and the ingestion path now
-- classifies those honestly — but rewriting the recorded outcome of past calls
-- is a different act from removing a value that was never really there.
-- =============================================================================

update public.calls set transcript = null where btrim(coalesce(transcript, '')) = '' and transcript is not null;
update public.calls set summary = null where btrim(coalesce(summary, '')) = '' and summary is not null;
update public.calls set ended_reason = null where btrim(coalesce(ended_reason, '')) = '' and ended_reason is not null;
update public.calls set error_message = null where btrim(coalesce(error_message, '')) = '' and error_message is not null;

-- Leads carry the same free-text fields, written from the same reports.
update public.leads set description = null where btrim(coalesce(description, '')) = '' and description is not null;
update public.leads set notes = null where btrim(coalesce(notes, '')) = '' and notes is not null;

-- -----------------------------------------------------------------------------
-- Postcondition: nothing readable claims to be readable when it is not.
-- -----------------------------------------------------------------------------
do $$
declare
  v_calls int;
  v_leads int;
begin
  select count(*) into v_calls
    from public.calls
   where btrim(coalesce(transcript, 'x')) = ''
      or btrim(coalesce(summary, 'x')) = ''
      or btrim(coalesce(ended_reason, 'x')) = '';

  select count(*) into v_leads
    from public.leads
   where btrim(coalesce(description, 'x')) = ''
      or btrim(coalesce(notes, 'x')) = '';

  if v_calls > 0 or v_leads > 0 then
    raise exception
      'empty-string cleanup missed % call row(s) and % lead row(s)', v_calls, v_leads;
  end if;
end $$;
