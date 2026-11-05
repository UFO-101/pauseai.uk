# Messages to supporters

Mailings to politicians are built: staff write, schedule and send them
from `/staff/mailings`. Underneath, a mailing is to either audience
(`mailings.audience`, with its `channel` and `topic`), and each
recipient's copy is a letter to a politician (`letters_from_pauseai`) or
a message to a supporter (`messages_to_supporters`, with its
`message_events`). To staff they're two things, in two places: mailings
are to politicians, under Mailings; messages are to supporters, under
Supporters, with the `supporters` permission, as a message can be a
text and is to someone who said yes to it. What's left is those staff
pages, by email or text, built on the politicians' components. Sending
by each channel has its own plan:

- `plans/supporters-email.md`: email.
- `plans/supporters-phone.md`: text, sent by WhatsApp. Staff choose
  text, never the backend, and the pages say text: WhatsApp is named
  only where the backend is, as Postmark and Gmail are ("by
  WhatsApp", "not on WhatsApp").

This is one pull request, designed first as mock-ups on the real staff
components, as the politicians' pages were.

## Rules

- Only accounts with the `supporters` permission see them.
- A message to supporters has one channel and one topic, fixed when it's
  made from the supporters list's Contact filter: "Can email", "Can
  text" or "Can call or text", answered yes, for one topic. "Not sure"
  isn't enough, so members can't be emailed PauseAI updates until we can
  read CiviCRM's unsubscribes (`plans/supporters-email.md`).
- Who it goes to is the supporters list's filter, kept in its stored
  filter as the list's URL parameters, as a mailing to politicians was
  before ticks. There's no ticking: the Contact filter is the yes, and
  the other filters narrow it. Scheduling fixes the recipients, as for
  politicians, and each is checked again just before sending:
  `contact_permission()` must still say yes, or the message is skipped,
  with the reason. A stop by any route, from the unsubscribe link to a
  word at an event, is a row in `opt_outs` that makes it say no: each
  channel's plan lists them ("Opt-outs" in `plans/supporters-email.md`
  and `plans/supporters-phone.md`).

## Pages

Under Supporters in the menu. The writer, its page, the list and the
recipients table are the politicians' components; what's new is on the
server, a supporters twin of `mailing-recipients.ts`, `mailing-drafts.ts`
and `mailing-pages.ts`: the filter to supporters, their merge fields
(first name, local group), who's left out and why, and
`messages_to_supporters` on scheduling. The mock-ups, screenshots of
the real components on fixture data, are on a design
canvas: https://claude.ai/artifact/1aTdfQjiCGiuN2zesjGBdG

- **Message 430 supporters**, in the count row of the supporters list,
  where the politicians list has New mailing, counting everyone the
  filters find. It needs the Contact filter, which gives the message its
  channel and topic. Without one the button is dotted, and clicking it
  says which filter to add. With one, it makes a draft to those the
  filters find and opens the writer.
- **The writer**, with the channel and topic shown and fixed, who it's
  to as the filter, a count of messages and their cost, and the reasons
  someone is left out: no permission for this topic, a stop, a blocked
  address or number, not on WhatsApp. Its From section says plainly
  who it will appear from: for an email the name and address, PauseAI
  UK at hello@pauseai.uk by Postmark, or a staff member's connected
  Gmail; for a text the WhatsApp business account's name, number and
  picture. (A politicians' mailing's Sent from is its second section,
  before the writing, as the letters go in that person's voice.)
- **A text's words** are a template WhatsApp has approved, picked in
  Write, or new words. Scheduling a text on new words sends them for
  approval and holds the text, "Scheduled, waiting for WhatsApp's
  approval", on its page and in the list; approved, it goes at the
  time chosen, or at the next hourly run if that has passed; rejected,
  it's a draft again with the reason in plain words and what to do,
  and the writer is emailed, as they are if it's still waiting an hour
  before it's due (`plans/supporters-phone.md`, "Templates").
- **Fields a supporter may not have.** No field is everyone's: some have
  no name, most no postcode, so no MP. A politicians' mailing with a
  field some recipients lack can't be scheduled; a message can. Each
  field has a fallback for those without it ("there" for a first name,
  "your local group"), and the conditional parts offer a condition for
  each ("have a local group", "have an MP") for sentences only those
  with it should get. The preview's case buttons cover each field as
  well as each condition, and the editor says how many lack each.
  Wanting only those with a postcode is a filter on the list.
- **Change who** opens the supporters list choosing for the draft, as
  the politicians list does for a mailing: the dark strip at the top
  naming the draft, with Cancel, and the dark bar at the foot with how
  many the filters find and the orange button back to the draft. No
  ticks: the person changes the filters, and the draft keeps them.
- **The list of messages**, emails and texts together, each row with
  its channel, and each message's page (`/staff/messages/<id>`): its
  counts (delivered, failed, stopped, replied, and for a text, read),
  the email as a mail app shows it or the text as a bubble, and its
  recipients, each with their status and a way to their replies.
- **Message and reply**, each copy's page (`/staff/messages/<id>/<copy>`),
  the messages' equivalent of a letter's page: when it was sent,
  delivered and, for a text, read; the message and every reply, an
  email's as the thread, a text's as the conversation; and a box to
  reply from the site, so nobody needs the phone. A text reply is free
  within 24 hours of the person's last message, and the page says
  until when; after that only an approved template can go. Replies
  arrive by Postmark's inbound webhook for email and WhatsApp's
  webhook for texts (`plans/supporters-phone.md`, "Replies"). A
  supporter's page lists the messages they were sent, with their
  replies.
- **Words.** It's a message and a reply, never a letter: letters are
  supporters' prewritten letters to MPs and the letters we ask MPs to
  sign, the formal ones.

Both previews send a test copy, as a mailing's does: an email to an
address, by Postmark; a text to a number, by WhatsApp, which needs the
number to have saved ours or messaged it first. A text is written in
the same writer, with no subject or files, and previewed as a
messaging app shows it: the words in a bubble from us, with the time,
and the Stop button under it. A sent text's page shows
the same bubble where an email's shows the email. The words, and
Meta's template review before it can be scheduled, are the WhatsApp
pull request's (`plans/supporters-phone.md`).
