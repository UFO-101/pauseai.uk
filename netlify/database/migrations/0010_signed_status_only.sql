-- "Supports" is no longer a status: staff record only who has signed
-- (lib/content/email-your-mp.ts). The code before this one already never
-- writes it. Any "supports" rows go, each kept in the audit log first so
-- the Changes page shows what was removed, and the check then allows
-- "signed" only.
INSERT INTO audit_log (actor, action, details)
SELECT 'migration', 'remove supports status', jsonb_build_object(
  'politicianId', politician_id, 'campaign', campaign, 'statusDate', status_date, 'note', note, 'updatedBy', updated_by, 'updatedAt', updated_at
)
FROM campaign_statuses
WHERE status = 'supports';

DELETE FROM campaign_statuses WHERE status = 'supports';

ALTER TABLE campaign_statuses DROP CONSTRAINT campaign_statuses_status_check;
ALTER TABLE campaign_statuses ADD CONSTRAINT campaign_statuses_status_check CHECK (status = 'signed');
