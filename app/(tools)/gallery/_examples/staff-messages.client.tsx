"use client";

// The interactive examples of the pages of messages to supporters.
import { useState } from "react";
import { Numbered, DraftTitle } from "@/app/(staff)/staff/_components/DraftWriter";
import MessageWriter, { type MessageWriterActions } from "@/app/(staff)/staff/_components/MessageWriter";
import {
  exampleMessageData,
  exampleMessageEmail,
  exampleMessageText,
  exampleTemplates,
  exampleTextWords,
} from "@/app/(staff)/staff/_components/MessageWriter.examples";
import TemplatePicker from "@/app/(staff)/staff/_components/TemplatePicker";
import { Muted } from "@/components/ui/Text";
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
