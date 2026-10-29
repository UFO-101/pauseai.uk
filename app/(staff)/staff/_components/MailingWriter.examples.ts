import type { MailingDoc } from "@/lib/mailing-doc";
import type { WrittenMailing } from "@/lib/server/mailing-drafts";
import type { WriterData } from "@/lib/server/mailing-pages";
import { exampleAsks } from "./PoliticianTable.examples";

/** A letter with a salutation, and a thank-you only for those who signed the letter to the PM. */
export const exampleMailingLetter: MailingDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Dear " },
        { type: "field", attrs: { field: "salutation" } },
        { type: "text", text: "," },
      ],
    },
    {
      type: "onlyFor",
      attrs: { condition: "frontier-ai-letter:signed" },
      content: [{ type: "paragraph", content: [{ type: "text", text: "Thank you for signing the letter." }] }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Will you come to the example conference?", marks: [{ type: "bold" }] },
        { type: "hardBreak" },
        { type: "text", text: "It's in ", marks: [{ type: "italic" }] },
        { type: "field", attrs: { field: "constituency" }, marks: [{ type: "italic" }] },
      ],
    },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
  ],
};

/**
 * A mailing to the Commons who aren't Labour: Polly, who signed the letter
 * to the PM, and Dora, a peer with no constituency; Ned has no address and
 * Bob's is blocked.
 */
export const exampleWriterData: WriterData = {
  filter: { list: "politicians", params: { house: "commons", party: "!Labour", ask: "frontier-ai-letter" } },
  parties: ["Green", "Labour"],
  asks: exampleAsks,
  unknown: [],
  recipients: [
    {
      id: 7,
      name: "Polly Placeholder",
      constituency: "Exampleton",
      email: "polly@example.org",
      values: { salutation: "Ms Placeholder", name: "Polly Placeholder", constituency: "Exampleton" },
      meets: ["frontier-ai-letter:signed"],
    },
    {
      id: 8,
      name: "Dora Dummy",
      constituency: null,
      email: "dora@example.org",
      values: { salutation: "Lady Dummy", name: "Dora Dummy", constituency: "" },
      meets: [],
    },
  ],
  leftOut: [
    { id: 9, name: "Ned Noaddress", reason: "no-address" },
    { id: 10, name: "Bob Bounced", reason: "blocked" },
  ],
  fields: [
    { id: "salutation", label: "salutation", lacking: 0 },
    { id: "name", label: "name", lacking: 0 },
    { id: "constituency", label: "constituency", lacking: 1 },
  ],
  conditions: [
    {
      id: "frontier-ai-letter:signed",
      label: "signed the Example Letter to the PM",
      covers: 1,
      group: "Example Letter to the PM",
      option: "Signed",
    },
    {
      id: "edinburgh-conference-2026:going",
      label: "going to the Example Conference",
      covers: 0,
      group: "Example Conference",
      option: "Going",
    },
    {
      id: "edinburgh-conference-2026:declined",
      label: "declined the Example Conference",
      covers: 0,
      group: "Example Conference",
      option: "Declined",
    },
  ],
  senders: [
    { email: "al@pauseai.uk", connectedAt: "2026-10-01T09:00:00Z", sentToday: 0, remaining: 1800 },
    { email: "sam@pauseai.uk", connectedAt: "2026-10-02T09:00:00Z", sentToday: 120, remaining: 1680 },
  ],
  me: "jo@pauseai.uk",
  sends: false,
};

/** Jo's draft of it, with a file, from Jo, on 1 December at nine. */
export const exampleWrittenMailing: WrittenMailing = {
  id: 12,
  filter: exampleWriterData.filter,
  subject: "Come to the example conference",
  body: exampleMailingLetter,
  ask: "edinburgh-conference-2026",
  createdBy: "jo@pauseai.uk",
  sentFrom: "jo@pauseai.uk",
  fromName: "Jo Example",
  dueAt: "2026-12-01T09:00:00Z",
  state: "draft",
  version: 3,
  attachments: [
    { id: 1, filename: "programme.pdf", contentType: "application/pdf", size: 1024 },
    { id: 2, filename: "venue.png", contentType: "image/png", size: 2_300_000 },
    { id: 3, filename: "notes.docx", contentType: "application/octet-stream", size: 800 },
  ],
};
