import type { LetterThread } from "@/lib/server/letter-threads";
import type { GmailAccount } from "@/lib/server/gmail-accounts";
import type { EditableAsk } from "./AskForm";

/** Jo's letter to Polly, from Jo's Gmail, which Polly answered and Jo answered back, after an out-of-office. */
export const exampleThread: LetterThread = {
  letterId: 35,
  mailingId: 11,
  mailingTitle: "Edinburgh follow-up",
  politician: { id: 5, name: "Polly Placeholder", email: "polly.placeholder.mp@parliament.uk" },
  status: "sent",
  sentAt: "2026-10-09T09:00:00Z",
  subject: "Edinburgh follow-up",
  letter: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Dear Ms Placeholder," }] },
      { type: "paragraph", content: [{ type: "text", text: "Will you come and meet us?" }] },
    ],
  },
  sentFrom: "jo@pauseai.uk",
  fromName: "Jo Seed",
  gmailThreadId: "thread-seed-2",
  events: [{ at: "2026-10-09T09:01:00Z", status: "auto_reply" }],
  messages: [
    {
      id: 1,
      at: "2026-10-10T09:00:00Z",
      fromName: "Polly Placeholder",
      fromAddress: "polly.placeholder.mp@parliament.uk",
      fromUs: false,
      subject: "Re: Edinburgh follow-up",
      text: "Dear Jo,\n\nThank you for writing to me. I'd be glad to meet.\n\nPolly",
    },
    {
      id: 2,
      at: "2026-10-10T11:30:00Z",
      fromName: "Jo Seed",
      fromAddress: "jo@pauseai.uk",
      fromUs: true,
      subject: "Re: Edinburgh follow-up",
      text: null,
    },
  ],
};

/** An imported letter: no text, never sent from a Gmail, no replies. */
export const exampleImportedThread: LetterThread = {
  ...exampleThread,
  letter: null,
  sentFrom: null,
  fromName: null,
  gmailThreadId: null,
  sentAt: null,
  status: "not_sent",
  events: [],
  messages: [],
};

/** Jo's Gmail, connected, with some sent today. */
export const exampleGmailAccount: GmailAccount = {
  email: "jo@pauseai.uk",
  connectedAt: "2026-10-01T09:00:00Z",
  sentToday: 120,
  remaining: 1680,
};

/** An ask staff added, which nobody has answered. */
export const exampleEditableAsk: EditableAsk = {
  slug: "winter-reception-dec-2026",
  title: "Winter reception",
  kind: "event",
  date: "2026-12-09",
  url: null,
  askedBy: ["pauseai"],
  fixed: false,
  kindFixed: false,
  deletable: true,
};
