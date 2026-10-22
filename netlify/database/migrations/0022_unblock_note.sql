-- Unblocking an address says why: the audit log refuses an "unblock
-- address" entry without a note. NOT VALID, so an unblock logged before
-- this, without one, stays as it was; every new entry is checked.
ALTER TABLE audit_log ADD CONSTRAINT audit_log_unblock_note
  CHECK (action <> 'unblock address' OR btrim(coalesce(details->>'note', '')) <> '') NOT VALID;
