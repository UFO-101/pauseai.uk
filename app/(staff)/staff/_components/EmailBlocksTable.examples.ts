import type { EmailBlock, ProblemSummary } from "@/lib/server/email";

/** The test MP's address, blocked by a letter's hard bounce, with two emails not sent since. */
export const exampleBlock: EmailBlock = {
  address: "no-such-mailbox@pauseai.uk",
  kind: "hard",
  reason: "The server was unable to deliver your message (ex: unknown user, mailbox not found).",
  since: "2026-10-12T09:10:00Z",
  canReset: true,
  politicians: [{ id: 5, name: "Bouncy McTestface MP" }],
  letterId: 1,
  refused: 2,
};

/** An address blocked by a spam complaint, which can't be unblocked, and isn't a politician's. */
export const exampleComplaint: EmailBlock = {
  address: "sender@example.org",
  kind: "complaint",
  reason: "",
  since: "2026-10-11T15:00:00Z",
  canReset: false,
  politicians: [],
  letterId: null,
  refused: 0,
};

/** That hard bounce, a soft one on a forwarded reply, and the complaint about a login link. */
export const exampleProblems: ProblemSummary[] = [
  {
    id: 3,
    at: exampleBlock.since,
    address: exampleBlock.address,
    kind: "hard",
    reason: exampleBlock.reason,
    purpose: "letter",
    letterId: 1,
  },
  {
    id: 2,
    at: "2026-10-11T16:00:00Z",
    address: "jane@example.com",
    kind: "soft",
    reason: "Mailbox full",
    purpose: "forwarded-reply",
    letterId: null,
  },
  {
    id: 1,
    at: exampleComplaint.since,
    address: exampleComplaint.address,
    kind: "complaint",
    reason: "",
    purpose: null,
    letterId: null,
  },
];
