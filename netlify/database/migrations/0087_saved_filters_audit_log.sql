-- The audit log's filters can be saved too.
ALTER TABLE saved_filters DROP CONSTRAINT saved_filters_list_check;
ALTER TABLE saved_filters ADD CONSTRAINT saved_filters_list_check
  CHECK (list IN ('politicians', 'supporters', 'events', 'audit-log'));
