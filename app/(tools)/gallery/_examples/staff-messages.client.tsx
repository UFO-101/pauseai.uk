"use client";

// The interactive examples of the pages of messages to supporters.
import { useState } from "react";
import { Numbered, DraftTitle } from "@/app/(staff)/staff/_components/DraftWriter";
import { MailingStanding } from "@/app/(staff)/staff/_components/MailingView";
import MessageCopyView from "@/app/(staff)/staff/_components/MessageCopyView";
import MessageFor, { MessageWho } from "@/app/(staff)/staff/_components/MessageFor";
import { ChoosingMessageFrame, MessageSupporters } from "@/app/(staff)/staff/_components/MessageSupporters";
import MessageView from "@/app/(staff)/staff/_components/MessageView";
import MessageWriter, { type MessageWriterActions } from "@/app/(staff)/staff/_components/MessageWriter";
import {
  exampleMessageCopy,
  exampleMessageData,
  exampleMessageEmail,
  exampleMessageSent,
  exampleMessageSummary,
  exampleSupporterChoices,
  exampleMessageText,
  exampleTemplates,
  exampleTextWords,
} from "@/app/(staff)/staff/_components/MessageWriter.examples";
import TemplatePicker from "@/app/(staff)/staff/_components/TemplatePicker";
import { Muted } from "@/components/ui/Text";
import { supportersSearch } from "@/lib/staff-search";
import { Logged } from "../_components/wiring";

function messageActions(log: (name: string) => (...args: unknown[]) => void): MessageWriterActions {
  return {
    save: async (...args) => {
      log("saveMessage")(...args);
      return { saved: true, version: 5 };
    },
    attach: async (form) => {
      log("attachToMessage")(form);
      return undefined;
    },
    detach: async (...args) => {
      log("detachFromMessage")(...args);
      return { saved: true, version: 5, attachments: [] };
    },
    sendTest: async (id, supporter, to) => {
      log("sendMessageTestNow")(id, supporter, to);
      return { sent: true, id: "example", to };
    },
    schedule: async (...args) => {
      log("scheduleMessageNow")(...args);
      return { scheduled: false, problems: [] };
    },
    deleteDraft: log("deleteMessageDraft"),
  };
}

/** The writer: an email, or a text with no template, one chosen, new words, or rejected. */
export function MessageWriterExample({ kind }: { kind: "email" | "choose" | "template" | "new" | "rejected" | "off" }) {
  const draft =
    kind === "email"
      ? exampleMessageEmail
      : kind === "choose" || kind === "off"
        ? exampleMessageText
        : kind === "template"
          ? {
              ...exampleMessageText,
              title: exampleTemplates[0].name,
              body: exampleTextWords,
              template: exampleTemplates[0],
            }
          : kind === "new"
            ? { ...exampleMessageText, title: "Hi {first name}", body: exampleTextWords }
            : {
                ...exampleMessageText,
                title: "Hi {first name}",
                body: exampleTextWords,
                template: {
                  ...exampleTemplates[0],
                  status: "rejected" as const,
                  rejectedAt: "2026-11-05T14:02:00Z",
                  rejectedReason: "The text ends with a merge field.",
                },
              };
  const data = kind === "off" ? { ...exampleMessageData, sends: false, textNumber: null } : exampleMessageData;
  return (
    <Logged>
      {(log) => (
        <MessageWriter
          data={data}
          draft={draft}
          who={<Muted>Text · PauseAI London March</Muted>}
          actions={messageActions(log)}
        />
      )}
    </Logged>
  );
}

/** The templates, chosen one logged. */
export function TemplatePickerExample() {
  const [chosen, setChosen] = useState("");
  return (
    <>
      <TemplatePicker
        templates={exampleTemplates}
        onChoose={(one) => setChosen(one.name)}
        onNew={() => setChosen("new")}
      />
      <Muted>{chosen}</Muted>
    </>
  );
}

/** A draft's title, with whether it's saved, and a numbered section's title. */
export function DraftTitleExample() {
  return (
    <>
      <DraftTitle title="Events near you this month" saveState="saved" />
      <h2>
        <Numbered n={1}>To</Numbered>
      </h2>
    </>
  );
}

const nothing = async () => {};
const yes = supportersSearch({ contact: "email:pauseai-updates:yes", near: "LS1" });

/** Message N supporters with a Contact filter answered yes, then without one: dashed. */
export function MessageSupportersExample() {
  return (
    <>
      <MessageSupporters search={yes} total={430} action={nothing} />
      <MessageSupporters search={supportersSearch({ near: "LS1" })} total={1180} action={nothing} />
    </>
  );
}

/** The list choosing who a draft goes to. */
export function ChoosingMessageFrameExample() {
  return (
    <ChoosingMessageFrame
      choosing={{ id: 3, title: "Events near you", channel: "email", topic: "pauseai-updates" }}
      search={yes}
      total={430}
      keep={nothing}
    >
      <p>The list.</p>
    </ChoosingMessageFrame>
  );
}

/** A message's page: an email sent, a text sent, or a text scheduled, waiting for approval. */
export function MessageViewExample({ kind }: { kind: "email" | "text" | "waiting" }) {
  const text = {
    channel: "text" as const,
    sentFrom: "+447700900000",
    body: exampleMessageCopy.body,
  };
  const data =
    kind === "email"
      ? exampleMessageSent
      : kind === "text"
        ? {
            ...exampleMessageSent,
            summary: { ...exampleMessageSummary, channel: "text" as const, read: 240 },
            written: { ...exampleMessageSent.written, ...text },
          }
        : {
            ...exampleMessageSent,
            summary: { ...exampleMessageSummary, channel: "text" as const, state: "scheduled" as const, waiting: true },
            written: {
              ...exampleMessageSent.written,
              ...text,
              state: "scheduled" as const,
              dueAt: "2026-11-07T07:18:00Z",
            },
          };
  return (
    <MessageView
      data={data}
      who={
        <MessageWho
          channel={data.written.channel}
          params={exampleMessageData.filter.params}
          choices={exampleSupporterChoices}
        />
      }
      stop={nothing}
      reschedule={nothing}
    />
  );
}

/** A message's page, as it stands: here, sent. */
export function MessageForExample() {
  return (
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
  );
}

/** One sending, with Stop sending. */
export function MailingStandingExample() {
  return (
    <MailingStanding
      mailing={exampleMessageSummary}
      written={{ ...exampleMessageSent.written, state: "sending" }}
      stop={nothing}
      reschedule={nothing}
    />
  );
}

/** Message and reply: a text as the conversation, or an email as the thread. */
export function MessageCopyViewExample({ email = false }: { email?: boolean }) {
  const one = email
    ? {
        ...exampleMessageCopy,
        channel: "email" as const,
        subject: "Thank you for marching",
        sentFrom: "hello@pauseai.uk",
        address: "jane@example.com",
        readAt: null,
      }
    : exampleMessageCopy;
  return <MessageCopyView one={one} reply={nothing} />;
}
