-- A politician can answer a letter ask with Declined: they said they won't
-- sign it. It isn't an ask done.
INSERT INTO ask_kind_statuses (kind, status) VALUES ('letter', 'declined');
