-- Each time an address opted out of a mailing list, from any source, and
-- when it opted back in, if it has (lib/server/opt-outs.ts). Keyed by
-- address, not by person: an unsubscribe can arrive before we know whose
-- address it is. Nothing reads it to stop email yet.
CREATE TABLE opt_outs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  address text NOT NULL CHECK (address = lower(address)),
  -- The list opted out of: the Luma calendar's emails.
  list text NOT NULL CHECK (list IN ('luma-calendar')),
  -- What told us: Luma's calendar.person.unsubscribed webhook.
  source text NOT NULL CHECK (source IN ('luma-webhook')),
  -- The source's own ID for it (Luma's Webhook-Id), so a redelivery is a no-op.
  source_ref text NOT NULL,
  unsubscribed_at timestamptz NOT NULL,
  -- Open, so opted out, while null.
  resubscribed_at timestamptz,
  UNIQUE (source, source_ref)
);
-- An address has at most one open opt-out per list.
CREATE UNIQUE INDEX opt_outs_open ON opt_outs (address, list) WHERE resubscribed_at IS NULL;
