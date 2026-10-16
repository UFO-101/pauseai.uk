// Email your MP's tool and the letter's steps
// (app/(site)/campaigns/_components/): finding the MP, writing the letter,
// its preview and "sent", and the parts they're made of.
import { campaigns } from "@/lib/content/email-your-mp";
import AttachmentChips from "@/app/(site)/campaigns/_components/AttachmentChips";
import { exampleMp } from "@/app/(site)/campaigns/_components/draft.examples";
import { Column, ErrorText, Field, Notice } from "@/app/(site)/campaigns/_components/FormParts";
import LetterStep from "@/app/(site)/campaigns/_components/LetterStep";
import MpCard from "@/app/(site)/campaigns/_components/MpCard";
import Required from "@/app/(site)/campaigns/_components/Required";
import type { Group } from "../_components/types";
import {
  EmailYourMpToolExample,
  EmailYourMpToolTestMpsExample,
  LetterEditorExample,
  LetterFormExample,
  LetterFormNoAttachmentsExample,
  LetterPreviewExample,
  LetterPreviewPlainExample,
  LetterSentExample,
  LetterWriteExample,
  LetterWriteSignedExample,
  TurnstileExample,
} from "./campaigns-letter.client";

const [letterToPm] = campaigns;

export const campaignsLetter: Group = {
  id: "campaigns-letter",
  title: "Email your MP: the letter",
  examples: [
    {
      name: "EmailYourMpTool",
      file: "app/(site)/campaigns/_components/EmailYourMpTool.tsx",
      variants: [
        {
          label: "Find my MP, filled in from the last lookup",
          render: () => (
            <div className="container">
              <EmailYourMpToolExample />
            </div>
          ),
        },
        {
          label: "With the test MPs' postcodes, as outside production",
          render: () => (
            <div className="container">
              <EmailYourMpToolTestMpsExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "LetterStep",
      file: "app/(site)/campaigns/_components/LetterStep.tsx",
      variants: [
        {
          label: "A heading and what's on the step",
          render: () => (
            <LetterStep title="An example step">
              <p>What&rsquo;s on it, in one centred column.</p>
            </LetterStep>
          ),
        },
        {
          label: "With something full width after it",
          render: () => (
            <LetterStep
              title="An example step"
              after={
                <div className="container">
                  <p>Something after the step, the page&rsquo;s full width.</p>
                </div>
              }
            >
              <p>What&rsquo;s on it.</p>
            </LetterStep>
          ),
        },
      ],
    },
    {
      name: "LetterWrite",
      file: "app/(site)/campaigns/_components/LetterWrite.tsx",
      variants: [
        {
          label: "The MP found, and the letter to them",
          render: () => (
            <div className="container">
              <LetterWriteExample />
            </div>
          ),
        },
        {
          label: "The bill's letter, to an MP who signed ControlAI's",
          render: () => (
            <div className="container">
              <LetterWriteSignedExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "LetterForm",
      file: "app/(site)/campaigns/_components/LetterForm.tsx",
      variants: [
        {
          label: "With attachments",
          render: () => (
            <div className="container">
              <Column>
                <LetterFormExample />
              </Column>
            </div>
          ),
        },
        {
          label: "Without attachments",
          render: () => (
            <div className="container">
              <Column>
                <LetterFormNoAttachmentsExample />
              </Column>
            </div>
          ),
        },
      ],
    },
    {
      name: "LetterEditor",
      file: "app/(site)/campaigns/_components/LetterEditor.tsx",
      variants: [
        {
          label: "Paragraphs, bold, italic and a list",
          render: () => (
            <div className="container">
              <Column>
                <LetterEditorExample />
              </Column>
            </div>
          ),
        },
      ],
    },
    {
      name: "LetterPreview",
      file: "app/(site)/campaigns/_components/LetterPreview.tsx",
      variants: [
        {
          label: "With attachments and the anti-spam check",
          render: () => (
            <div className="container">
              <Column>
                <LetterPreviewExample />
              </Column>
            </div>
          ),
        },
        {
          label: "Without attachments or the check",
          render: () => (
            <div className="container">
              <Column>
                <LetterPreviewPlainExample />
              </Column>
            </div>
          ),
        },
      ],
    },
    {
      name: "LetterSent",
      file: "app/(site)/campaigns/_components/LetterSent.tsx",
      variants: [
        {
          label: "Thanks, naming the MP",
          render: () => (
            <div className="container">
              <Column>
                <LetterSentExample />
              </Column>
            </div>
          ),
        },
      ],
    },
    {
      name: "MpCard",
      file: "app/(site)/campaigns/_components/MpCard.tsx",
      variants: [
        {
          label: "With their email",
          render: () => (
            <div className="container">
              <Column>
                <MpCard mp={exampleMp} />
              </Column>
            </div>
          ),
        },
        {
          label: "Without an email",
          render: () => (
            <div className="container">
              <Column>
                <MpCard mp={{ ...exampleMp, email: null }} />
              </Column>
            </div>
          ),
        },
      ],
    },
    {
      name: "AttachmentChips",
      file: "app/(site)/campaigns/_components/AttachmentChips.tsx",
      variants: [
        {
          label: "In the form",
          render: () => (
            <div className="container">
              <Column>
                <AttachmentChips attachments={letterToPm.attachments} label="Attachments" />
              </Column>
            </div>
          ),
        },
        {
          label: "Ruled, under a letter",
          render: () => (
            <div className="container">
              <Column>
                <AttachmentChips attachments={letterToPm.attachments} label="Attachments" ruled />
              </Column>
            </div>
          ),
        },
      ],
    },
    {
      name: "Turnstile",
      file: "app/(site)/campaigns/_components/Turnstile.tsx",
      variants: [
        {
          label: "Cloudflare's widget, stood in for here as in the flows",
          render: () => (
            <div className="container">
              <TurnstileExample />
            </div>
          ),
        },
      ],
    },
    {
      name: "Required",
      file: "app/(site)/campaigns/_components/Required.tsx",
      variants: [
        {
          label: "A label's words, with the asterisk",
          render: () => (
            <div className="container">
              <label>
                <Required>Example field</Required>
                <input name="example" required />
              </label>
            </div>
          ),
        },
      ],
    },
    {
      name: "Column",
      file: "app/(site)/campaigns/_components/FormParts.tsx",
      variants: [
        {
          label: "The tool's one column",
          render: () => (
            <div className="container">
              <Column>
                <p>The letter&rsquo;s width, in line with the section&rsquo;s heading.</p>
              </Column>
            </div>
          ),
        },
      ],
    },
    {
      name: "Field",
      file: "app/(site)/campaigns/_components/FormParts.tsx",
      variants: [
        {
          label: "A label, its control and a hint",
          render: () => (
            <div className="container">
              <Column>
                <Field>
                  <label>
                    Example field
                    <input name="example-field" />
                  </label>
                  <small>A hint under it.</small>
                </Field>
              </Column>
            </div>
          ),
        },
      ],
    },
    {
      name: "ErrorText",
      file: "app/(site)/campaigns/_components/FormParts.tsx",
      variants: [
        {
          label: "What went wrong",
          render: () => (
            <div className="container">
              <Column>
                <ErrorText>An example of something that went wrong.</ErrorText>
              </Column>
            </div>
          ),
        },
      ],
    },
    {
      name: "Notice",
      file: "app/(site)/campaigns/_components/FormParts.tsx",
      variants: [
        {
          label: "A note with an orange edge",
          render: () => (
            <div className="container">
              <Column>
                <Notice>An example note, set apart.</Notice>
              </Column>
            </div>
          ),
        },
      ],
    },
  ],
};
