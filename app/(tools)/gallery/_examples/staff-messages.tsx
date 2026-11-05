// The staff interface's messages to supporters: from the supporters list, the
// writer, the list of them, each one's page, and one copy with its replies.
import {
  ChoosingMessageFrame,
  MessageSupporters,
  NeedsContactFilter,
} from "@/app/(staff)/staff/_components/MessageSupporters";
import { MailingStanding, MailingWhen } from "@/app/(staff)/staff/_components/MailingView";
import MessageCopyView from "@/app/(staff)/staff/_components/MessageCopyView";
import MessageFor, { MessageWho } from "@/app/(staff)/staff/_components/MessageFor";
import MessageView, { MessageChannelName } from "@/app/(staff)/staff/_components/MessageView";
import {
  exampleMessageCopy,
  exampleMessageData,
  exampleMessageSent,
  exampleMessageSummary,
  exampleSupporterChoices,
} from "@/app/(staff)/staff/_components/MessageWriter.examples";
import MessagesOverview from "@/app/(staff)/staff/_components/MessagesOverview";
import SupporterMessages from "@/app/(staff)/staff/_components/SupporterMessages";
import TextBubble, { ChatBubble, ChatWall } from "@/app/(staff)/staff/_components/TextBubble";
import StaffPage from "@/app/(staff)/staff/_components/ui/StaffPage";
import { mailingGroups } from "@/lib/mailing-groups";
import { supportersSearch } from "@/lib/staff-search";
import type { Group } from "../_components/types";
import { DraftTitleExample, MessageWriterExample, TemplatePickerExample } from "./staff-messages.client";

const C = "app/(staff)/staff/_components";
const nothing = async () => {};
const now = "2026-11-05T12:00:00Z";
const yes = supportersSearch({ contact: "email:pauseai-updates:yes", near: "LS1" });
const groups = mailingGroups(
  {
    drafts: [{ ...exampleMessageSummary, id: 3, state: "draft" as const, title: "Events near you", to: 412 }],
    comingUp: [
      {
        ...exampleMessageSummary,
        id: 4,
        state: "scheduled" as const,
        channel: "text" as const,
        waiting: true,
        dueAt: "2026-11-07T07:18:00Z",
        title: "March day: where to meet",
        fromName: "PauseAI UK",
        sentFrom: "+447700900000",
      },
      {
        ...exampleMessageSummary,
        id: 6,
        state: "scheduled" as const,
        dueAt: "2026-11-08T07:18:00Z",
        title: "Sunday's stall",
      },
    ],
    sent: [
      exampleMessageSummary,
      { ...exampleMessageSummary, id: 7, channel: "text" as const, read: 240, title: "PauseCon: the room has changed" },
    ],
  },
  new Date(now),
);

export const staffMessages: Group = {
  id: "staff-messages",
  title: "The staff interface: messages to supporters",
  examples: [
    {
      name: "MessageSupporters",
      file: `${C}/MessageSupporters.tsx`,
      variants: [
        {
          label: "With a Contact filter answered yes, then without one: dashed",
          render: () => (
            <StaffPage as="div">
              <MessageSupporters search={yes} total={430} action={nothing} />
              <MessageSupporters search={supportersSearch({ near: "LS1" })} total={1180} action={nothing} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "NeedsContactFilter",
      file: `${C}/MessageSupporters.tsx`,
      variants: [
        {
          label: "What pressing the dashed button says",
          render: () => (
            <StaffPage as="div">
              <NeedsContactFilter search={supportersSearch({ why: "contact" })} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "ChoosingMessageFrame",
      file: `${C}/MessageSupporters.tsx`,
      variants: [
        {
          label: "Change who: the dark strip at the top and, in place of the bar at the foot, how the filters stand",
          render: () => (
            <StaffPage as="div">
              <ChoosingMessageFrame
                choosing={{ id: 3, title: "Events near you", channel: "email", topic: "pauseai-updates" }}
                search={yes}
                total={430}
                keep={nothing}
              >
                <p>The list.</p>
              </ChoosingMessageFrame>
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MessageWriter",
      file: `${C}/MessageWriter.tsx`,
      variants: [
        {
          label: "A draft email",
          render: () => (
            <StaffPage as="div">
              <MessageWriterExample kind="email" />
            </StaffPage>
          ),
        },
        {
          label: "A draft text: the templates",
          render: () => (
            <StaffPage as="div">
              <MessageWriterExample kind="choose" />
            </StaffPage>
          ),
        },
        {
          label: "A template chosen",
          render: () => (
            <StaffPage as="div">
              <MessageWriterExample kind="template" />
            </StaffPage>
          ),
        },
        {
          label: "New words",
          render: () => (
            <StaffPage as="div">
              <MessageWriterExample kind="new" />
            </StaffPage>
          ),
        },
        {
          label: "Rejected",
          render: () => (
            <StaffPage as="div">
              <MessageWriterExample kind="rejected" />
            </StaffPage>
          ),
        },
        {
          label: "Before anything can be sent",
          render: () => (
            <StaffPage as="div">
              <MessageWriterExample kind="off" />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "TemplatePicker",
      file: `${C}/TemplatePicker.tsx`,
      variants: [
        {
          label: "Five, with a search and Show all",
          render: () => (
            <StaffPage as="div">
              <TemplatePickerExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "DraftTitle",
      file: `${C}/DraftWriter.tsx`,
      variants: [
        {
          label: "With whether it's saved",
          render: () => (
            <StaffPage as="div">
              <DraftTitleExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "Numbered",
      file: `${C}/DraftWriter.tsx`,
      variants: [
        {
          label: "A section's title, as in the draft above",
          render: () => (
            <StaffPage as="div">
              <DraftTitleExample />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MessagesOverview",
      file: `${C}/MessagesOverview.tsx`,
      variants: [
        {
          label: "Emails and texts together",
          render: () => (
            <StaffPage as="div">
              <MessagesOverview groups={groups} now={now} />
            </StaffPage>
          ),
        },
        {
          label: "None yet",
          render: () => (
            <StaffPage as="div">
              <MessagesOverview groups={[]} now={now} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MessageChannelName",
      file: `${C}/MessageView.tsx`,
      variants: [
        {
          label: "Each channel",
          render: () => (
            <>
              <MessageChannelName channel="email" />
              <MessageChannelName channel="text" />
            </>
          ),
        },
      ],
    },
    {
      name: "MessageView",
      file: `${C}/MessageView.tsx`,
      variants: [
        {
          label: "An email sent",
          render: () => (
            <StaffPage as="div">
              <MessageView
                data={exampleMessageSent}
                who={
                  <MessageWho
                    channel="email"
                    params={exampleMessageData.filter.params}
                    choices={exampleSupporterChoices}
                  />
                }
                stop={nothing}
                reschedule={nothing}
              />
            </StaffPage>
          ),
        },
        {
          label: "A text sent",
          render: () => (
            <StaffPage as="div">
              <MessageView
                data={{
                  ...exampleMessageSent,
                  summary: { ...exampleMessageSummary, channel: "text", read: 240 },
                  written: {
                    ...exampleMessageSent.written,
                    channel: "text",
                    sentFrom: "+447700900000",
                    body: exampleMessageCopy.body,
                  },
                }}
                who={
                  <MessageWho
                    channel="text"
                    params={{ contact: "phone:luma-calendar:yes" }}
                    choices={exampleSupporterChoices}
                  />
                }
                stop={nothing}
                reschedule={nothing}
              />
            </StaffPage>
          ),
        },
        {
          label: "A text scheduled, waiting for WhatsApp's approval",
          render: () => (
            <StaffPage as="div">
              <MessageView
                data={{
                  ...exampleMessageSent,
                  summary: { ...exampleMessageSummary, channel: "text", state: "scheduled", waiting: true },
                  written: {
                    ...exampleMessageSent.written,
                    channel: "text",
                    state: "scheduled",
                    sentFrom: "+447700900000",
                    body: exampleMessageCopy.body,
                    dueAt: "2026-11-07T07:18:00Z",
                  },
                }}
                who={
                  <MessageWho
                    channel="text"
                    params={{ contact: "phone:luma-calendar:yes" }}
                    choices={exampleSupporterChoices}
                  />
                }
                stop={nothing}
                reschedule={nothing}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MessageFor",
      file: `${C}/MessageFor.tsx`,
      variants: [
        {
          label: "As it stands: here, sent",
          render: () => (
            <StaffPage as="div">
              <MessageFor
                data={exampleMessageSent}
                actions={{
                  save: async () => undefined,
                  attach: async () => undefined,
                  detach: async () => ({ saved: true, version: 1, attachments: [] }),
                  sendTest: async () => undefined,
                  schedule: async () => ({ scheduled: true }),
                  deleteDraft: nothing,
                  stop: nothing,
                  reschedule: nothing,
                }}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MessageWho",
      file: `${C}/MessageFor.tsx`,
      variants: [
        {
          label: "Its channel, then the filter's words",
          render: () => (
            <StaffPage as="div">
              <MessageWho channel="email" params={exampleMessageData.filter.params} choices={exampleSupporterChoices} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingStanding",
      file: `${C}/MailingView.tsx`,
      variants: [
        {
          label: "Sending, with Stop sending",
          render: () => (
            <StaffPage as="div">
              <MailingStanding
                mailing={exampleMessageSummary}
                written={{ ...exampleMessageSent.written, state: "sending" }}
                stop={nothing}
                reschedule={nothing}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "MailingWhen",
      file: `${C}/MailingView.tsx`,
      variants: [
        {
          label: "When it went",
          render: () => (
            <dl>
              <MailingWhen mailing={exampleMessageSummary} written={exampleMessageSent.written} />
            </dl>
          ),
        },
      ],
    },
    {
      name: "MessageCopyView",
      file: `${C}/MessageCopyView.tsx`,
      variants: [
        {
          label: "A text, as the conversation",
          render: () => (
            <StaffPage as="div">
              <MessageCopyView one={exampleMessageCopy} reply={nothing} />
            </StaffPage>
          ),
        },
        {
          label: "An email, as the thread",
          render: () => (
            <StaffPage as="div">
              <MessageCopyView
                one={{
                  ...exampleMessageCopy,
                  channel: "email",
                  subject: "Thank you for marching",
                  sentFrom: "hello@pauseai.uk",
                  address: "jane@example.com",
                  readAt: null,
                }}
                reply={nothing}
              />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "SupporterMessages",
      file: `${C}/SupporterMessages.tsx`,
      variants: [
        {
          label: "Those they were sent, with their replies",
          render: () => (
            <StaffPage as="div">
              <SupporterMessages
                messages={[
                  {
                    copyId: 21,
                    messageId: 5,
                    title: "March day: where to meet",
                    channel: "text",
                    status: "delivered",
                    skipReason: null,
                    sentAt: "2026-11-07T07:18:00Z",
                    read: true,
                    replies: [{ at: "2026-11-07T07:52:00Z", body: "Great, thanks." }],
                  },
                  {
                    copyId: 22,
                    messageId: 6,
                    title: "",
                    channel: "email",
                    status: "failed",
                    skipReason: null,
                    sentAt: null,
                    read: false,
                    replies: [],
                  },
                ]}
              />
              <SupporterMessages messages={[]} />
            </StaffPage>
          ),
        },
      ],
    },
    {
      name: "TextBubble",
      file: `${C}/TextBubble.tsx`,
      variants: [
        {
          label: "A text with its Stop button",
          render: () => <TextBubble from="PauseAI UK" text="Hi Jane, the march meets at 11:00." time="07:18" />,
        },
      ],
    },
    {
      name: "ChatWall",
      file: `${C}/TextBubble.tsx`,
      variants: [
        {
          label: "A conversation",
          render: () => (
            <ChatWall>
              <ChatBubble who="Jane" when="07:52">
                Can I bring my dog?
              </ChatBubble>
              <ChatBubble who="Jo" when="08:10" ours>
                Yes.
              </ChatBubble>
            </ChatWall>
          ),
        },
      ],
    },
    {
      name: "ChatBubble",
      file: `${C}/TextBubble.tsx`,
      variants: [
        {
          label: "Theirs",
          render: () => (
            <ChatBubble who="Jane" when="07:52">
              Can I bring my dog?
            </ChatBubble>
          ),
        },
      ],
    },
  ],
};
