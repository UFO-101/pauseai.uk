-- The rows of contact_permissions that are unsubscribes, by either channel,
-- found from the open opt-outs, so counting them doesn't work out
-- everyone's answer.
CREATE VIEW contact_unsubscribes AS
SELECT o.channel, o.list AS topic, o.address, d.send, d.reason, d.at, d.source
FROM opt_outs o CROSS JOIN LATERAL contact_permission(o.list, o.channel, o.address) d
WHERE o.resubscribed_at IS NULL AND d.reason = 'unsubscribed';

DROP VIEW email_unsubscribes;
DROP FUNCTION email_permission(text, text);
