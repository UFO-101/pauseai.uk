import type { EmailBlock, ProblemSummary } from "@/lib/server/email";

/** The test MP's address, blocked by a letter's hard bounce, with two emails not sent since. */
export const exampleBlock: EmailBlock = {
  address: "no-such-mailbox@pauseai.uk",
  kind: "hard",
  reason: "The server was unable to deliver your message (ex: unknown user, mailbox not found).",
  since: "2026-10-12T09:10:00Z",
  canReset: true,
  foundInGmail: false,
  politicians: [{ id: 5, name: "Bouncy McTestface MP" }],
  letter: { id: 17, to: "Bouncy McTestface MP" },
  purpose: "letter",
  refused: 2,
};

/** An address blocked by a spam complaint about a forwarded reply, which can't be unblocked, and isn't a politician's. */
export const exampleComplaint: EmailBlock = {
  address: "sender@example.org",
  kind: "complaint",
  reason: "",
  since: "2026-10-11T15:00:00Z",
  canReset: false,
  foundInGmail: false,
  politicians: [],
  letter: null,
  purpose: "forwarded-reply",
  refused: 0,
};

/** A politician's address, blocked by a mailing's letter that bounced, found in the sender's Gmail. */
export const exampleGmailBlock: EmailBlock = {
  address: "old.office@parliament.uk",
  kind: "hard",
  reason: "550 5.1.1 The email account that you tried to reach does not exist.",
  since: "2026-10-13T10:00:00Z",
  canReset: true,
  foundInGmail: true,
  politicians: [{ id: 6, name: "Polly Placeholder" }],
  letter: { id: 21, to: "Polly Placeholder" },
  purpose: "mailing",
  refused: 0,
};

/** That hard bounce, a soft one on a forwarded reply, and a complaint about an email the site has no record of sending. */
export const exampleProblems: ProblemSummary[] = [
  {
    id: 3,
    at: exampleBlock.since,
    address: exampleBlock.address,
    kind: "hard",
    reason: exampleBlock.reason,
    foundInGmail: false,
    purpose: "letter",
    letter: { id: 17, to: "Bouncy McTestface MP" },
  },
  {
    id: 2,
    at: "2026-10-11T16:00:00Z",
    address: "jane@example.com",
    kind: "soft",
    reason: "Mailbox full",
    foundInGmail: true,
    purpose: "forwarded-reply",
    letter: null,
  },
  {
    id: 1,
    at: exampleComplaint.since,
    address: exampleComplaint.address,
    kind: "complaint",
    reason: "",
    foundInGmail: false,
    purpose: null,
    letter: null,
  },
];
