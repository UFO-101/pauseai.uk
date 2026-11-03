-- Two more kinds of email: the notice to an MP's office that a reply
-- couldn't be passed on, as the supporter's address bounces; and the daily
-- report to the notification inbox of how often supporters' addresses
-- bounce, and why.
ALTER TABLE email_sends DROP CONSTRAINT email_sends_purpose_check;
ALTER TABLE email_sends ADD CONSTRAINT email_sends_purpose_check CHECK (purpose IN (
  'letter', 'forwarded-reply', 'staff-login', 'staff-alert', 'mailing', 'mailing-test',
  'letter-copy', 'relay', 'supporter-notice', 'office-notice', 'staff-report'));
