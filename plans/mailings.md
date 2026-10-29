# Mailings to supporters

Mailings to politicians are built: staff write, schedule and send them
from `/staff/mailings`. The tables already hold messages to supporters
too (`messages_to_supporters`, `message_events`, and the `audience`,
`channel` and `topic` of `mailings`). What's left is the staff pages for
messages to supporters, by email, WhatsApp or text, built on those for
politicians. Sending by each channel has its own plan:

- `plans/supporters-email.md`: email.
- `plans/supporters-phone.md`: WhatsApp and texts.

This is one pull request, designed first as mock-ups on the real staff
components, as the politicians' pages were.

## Rules

- Only accounts with the `supporters` permission see them.
- Supporters are messaged only from a list filtered by a Contact filter
  answered "Can email", "Can WhatsApp" or "Can text" for one topic, and
  that filter sets the mailing's channel and topic. "Not sure" isn't
  enough, so members can't be emailed PauseAI updates until we can read
  CiviCRM's unsubscribes (`plans/supporters-email.md`). "Can WhatsApp"
  comes with WhatsApp (`plans/supporters-phone.md`).
- As for politicians, the recipients are fixed when the mailing is
  scheduled, and each is checked again just before sending:
  `contact_permission()` must still say yes, or the message is skipped,
  with the reason.

## Pages

Under Supporters in the menu.

- "Email these", "WhatsApp these" or "Text these" on the supporters
  list, following its Contact filter. Without such a filter the button
  is dotted, and clicking it says which filter to add.
- The new mailing page, with the channel and topic fixed by the filter,
  a count of messages and their cost, and stops among the reasons
  someone is skipped.
- The list of messages, and each message's page
  (`/staff/messages/<mailing>/<id>` or similar), with delivered, failed,
  stopped, replies and cost. A supporter's page lists the messages they
  were sent.
