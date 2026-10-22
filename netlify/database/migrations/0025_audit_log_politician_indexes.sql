-- A politician's history (politicianHistory in lib/server/politicians.ts)
-- reads three kinds of audit log entry, each by a field in its details. An
-- index for each kind, on that field and over that kind's rows only, so
-- the history reads that politician's entries alone, however long the log
-- grows with supporter views. The expressions are the query's own, casts
-- included, or Postgres can't use them.
CREATE INDEX audit_log_politician_edits ON audit_log (((details->>'id')::bigint))
  WHERE action IN ('add politician', 'edit politician', 'remove politician');
CREATE INDEX audit_log_status_sets ON audit_log (((details->>'politicianId')::bigint))
  WHERE action = 'set status';
CREATE INDEX audit_log_address_blocks ON audit_log ((details->>'address'))
  WHERE action IN ('block address', 'unblock address');
