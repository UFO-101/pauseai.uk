import type { MailingDoc } from "@/lib/mailing-doc";
import type { MessageTemplate, WrittenMessage } from "@/lib/server/message-drafts";
import type { MessageCopy, MessagePageData, MessageSummary, MessageWriterData } from "@/lib/server/message-pages";
import type { SupporterChoices } from "@/lib/server/supporters";

/** An email with a first name, a part only for those with a local group, and their MP. */
export const exampleMessageWords: MailingDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hi " },
        { type: "field", attrs: { field: "firstName" } },
        { type: "text", text: "," },
      ],
    },
    { type: "paragraph", content: [{ type: "text", text: "Here's what's on near you this month." }] },
    {
      type: "onlyFor",
      attrs: { condition: "has:localGroup" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Your local group is " },
            { type: "field", attrs: { field: "localGroup" } },
            { type: "text", text: "." },
          ],
        },
      ],
    },
    {
      type: "onlyFor",
      attrs: { condition: "!volunteer:yes" },
      content: [{ type: "paragraph", content: [{ type: "text", text: "Could you volunteer?" }] }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Have you written to " },
        { type: "field", attrs: { field: "mp" } },
        { type: "text", text: " yet?" },
      ],
    },
  ],
};

/** A text's words, with only a first name. */
export const exampleTextWords: MailingDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hi " },
        { type: "field", attrs: { field: "firstName" } },
        { type: "text", text: ", the march meets at 11:00 at Parliament Square. Look for the orange flags." },
      ],
    },
  ],
};

const template = (id: number, name: string, more: Partial<MessageTemplate> = {}): MessageTemplate => ({
  id,
  name,
  body: exampleTextWords,
  status: "approved",
  createdBy: "jo@pauseai.uk",
  approvedAt: "2026-10-20T10:00:00Z",
  rejectedAt: null,
  rejectedReason: null,
  lastUsedAt: null,
  lastUsedTo: 0,
  ...more,
});

/** More templates than show at first: one used, one made in WhatsApp Manager. */
export const exampleTemplates: MessageTemplate[] = [
  template(1, "March day reminder", { lastUsedAt: "2026-11-02T08:00:00Z", lastUsedTo: 318 }),
  template(2, "PauseCon room change", { createdBy: null }),
  template(3, "Event reminder"),
  template(4, "Local group meetup"),
  template(5, "Write to your MP"),
  template(6, "Thank you for coming"),
];

export const exampleSupporterChoices: SupporterChoices = {
  events: [{ id: "evt-3", name: "PauseAI London March", startAt: "2026-11-07T11:00:00Z" }],
  mps: [{ id: 7, name: "Alex Sobel", constituency: "Leeds Central and Headingley" }],
};

/**
 * Those a message finds: Jane, with everything, a volunteer; Sam, with no
 * local group or MP. Pat said no and Gus is blocked, and Tom asked us to stop.
 */
export const exampleMessageData: MessageWriterData = {
  filter: { list: "supporters", params: { contact: "email:pauseai-updates:yes", near: "LS1" } },
  choices: exampleSupporterChoices,
  unknown: [],
  count: 412,
  recipients: [
    {
      id: 7,
      name: "Jane Example",
      address: "jane@example.com",
      values: { firstName: "Jane", localGroup: "PauseAI Leeds", mp: "Alex Sobel" },
      meets: ["has:firstName", "has:localGroup", "has:mp", "volunteer:yes"],
    },
    {
      id: 8,
      name: "Sam",
      address: "sam@example.com",
      values: { firstName: "Sam", localGroup: "your local group", mp: "your MP" },
      meets: ["has:firstName"],
    },
  ],
  leftOut: [
    { id: 9, name: "Pat Example", reason: "no-permission" },
    { id: 10, name: "Gus Blocked", reason: "blocked" },
    { id: 11, name: "Tom Sample", reason: "stopped" },
  ],
  fields: [
    { id: "firstName", label: "first name", lacking: 23, fallback: true },
    { id: "localGroup", label: "local group", lacking: 140, fallback: true },
    { id: "mp", label: "their MP", lacking: 261, fallback: true },
  ],
  conditions: [
    {
      id: "has:localGroup",
      label: "⁂ have a local group",
      covers: 272,
      group: "What we know",
      option: "A local group",
    },
    { id: "has:mp", label: "⁂ have an MP", covers: 151, group: "What we know", option: "Their MP" },
    { id: "volunteer:yes", label: "⁂ volunteer", covers: 120, group: "Volunteering", option: "Volunteers" },
  ],
  senders: [
    { email: "jo@pauseai.uk", name: "Jo Example", connectedAt: "2026-10-01T10:00:00Z", sentToday: 12, remaining: 1988 },
  ],
  me: "jo@pauseai.uk",
  sends: true,
  templates: exampleTemplates,
  textNumber: "+447700900000",
};

/** A draft email, written. */
export const exampleMessageEmail: WrittenMessage = {
  id: 3,
  title: "Events near you this month",
  filter: exampleMessageData.filter,
  subject: "Events near you this month",
  body: exampleMessageWords,
  ask: null,
  createdBy: "jo@pauseai.uk",
  sentFrom: "hello@pauseai.uk",
  fromName: "PauseAI UK",
  dueAt: "2099-11-12T09:18:00.000Z",
  state: "draft",
  version: 4,
  attachments: [],
  channel: "email",
  topic: "pauseai-updates",
  template: null,
};

/** A draft text with nothing chosen. */
export const exampleMessageText: WrittenMessage = {
  ...exampleMessageEmail,
  id: 4,
  title: "",
  subject: "",
  body: { type: "doc", content: [] },
  sentFrom: "+447700900000",
  channel: "text",
  topic: "luma-calendar",
  filter: { list: "supporters", params: { contact: "phone:luma-calendar:yes" } },
};

const summary: MessageSummary = {
  id: 5,
  title: "Thank you for marching",
  ask: null,
  askTitle: null,
  imported: false,
  state: "sent",
  createdBy: "jo@pauseai.uk",
  fromName: "PauseAI UK",
  sentFrom: "hello@pauseai.uk",
  dueAt: "2026-10-18T10:00:00Z",
  updatedAt: "2026-10-18T10:00:00Z",
  to: 290,
  sentAt: "2026-10-18T10:00:00Z",
  sent: 276,
  failed: 6,
  stopped: 8,
  replied: 11,
  answered: 0,
  channel: "email",
  delivered: 276,
  read: 0,
  waiting: false,
};

/** A message as the list has it. */
export const exampleMessageSummary = summary;

/** A message's page, sent: Jane read it and replied, Sam's failed, Pat's skipped, Tom stopped and someone's erased. */
export const exampleMessageSent: Extract<MessagePageData, { kind: "written" }> = {
  kind: "written",
  written: { ...exampleMessageEmail, id: 5, title: summary.title, subject: summary.title, state: "sent" },
  summary,
  choices: exampleSupporterChoices,
  tab: "all",
  recipientsTotal: 5,
  page: 1,
  pages: 1,
  pageSize: 100,
  recipients: [
    {
      copyId: 21,
      supporterId: 7,
      name: "Jane Example",
      place: "Leeds",
      status: "delivered",
      skipReason: null,
      sentAt: "2026-10-18T10:00:00Z",
      read: true,
      replies: 1,
    },
    {
      copyId: 22,
      supporterId: 8,
      name: "Sam",
      place: null,
      status: "failed",
      skipReason: null,
      sentAt: "2026-10-18T10:00:00Z",
      read: false,
      replies: 0,
    },
    {
      copyId: 23,
      supporterId: 9,
      name: null,
      place: null,
      status: "skipped",
      skipReason: "blocked",
      sentAt: null,
      read: false,
      replies: 0,
    },
    {
      copyId: 24,
      supporterId: 11,
      name: "Tom Sample",
      place: null,
      status: "skipped",
      skipReason: "unsubscribed",
      sentAt: null,
      read: false,
      replies: 0,
    },
    {
      copyId: 25,
      supporterId: null,
      name: null,
      place: null,
      status: "delivered",
      skipReason: null,
      sentAt: "2026-10-18T10:00:00Z",
      read: false,
      replies: 0,
    },
  ],
};

/** A text sent to Jane, who answered, and we answered back. */
export const exampleMessageCopy: MessageCopy = {
  id: 21,
  messageId: 5,
  title: "March day: where to meet",
  channel: "text",
  to: 318,
  subject: "",
  body: exampleTextWords,
  fromName: "PauseAI UK",
  sentFrom: "+447700900000",
  supporterId: 7,
  name: "Jane Example",
  address: "+447700900001",
  merge: { values: { firstName: "Jane" }, meets: ["has:firstName"] },
  status: "delivered",
  skipReason: null,
  sentAt: "2026-11-07T07:18:00Z",
  deliveredAt: "2026-11-07T07:18:30Z",
  readAt: "2026-11-07T07:40:00Z",
  replies: [
    { id: 1, at: "2026-11-07T07:52:00Z", body: "Great, thanks. Is it OK to bring my dog?", sentBy: null },
    { id: 2, at: "2026-11-07T08:10:00Z", body: "Yes, dogs are very welcome.", sentBy: "jo@pauseai.uk" },
  ],
  replyUntil: "2026-11-08T07:52:00.000Z",
  sends: true,
  now: "2026-11-07T09:00:00.000Z",
};
