import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
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
const editor = () => page.getByRole("textbox", { name: "Letter", exact: true });

afterEach(() => {
  sessionStorage.clear();
  delete (window as Window & { turnstile?: unknown }).turnstile;
});

describe("Email your MP's gallery examples", () => {
  it("gives each step its own lookup, draft or letter sent, in turn", async () => {
    await render(
      <>
        <EmailYourMpToolExample />
        <LetterWriteSignedExample />
        <LetterSentExample />
        <LetterPreviewPlainExample />
        <LetterWriteExample />
      </>,
    );
    await expect.element(page.getByRole("status")).toHaveTextContent(copy.sent.body("Polly Placeholder"));
    await expect.element(page.getByRole("link", { name: copy.sobelBill.signedNote.link })).toBeVisible();
    await expect.element(page.getByText("My subject")).toBeVisible();
    await expect.element(page.getByRole("button", { name: copy.preview.send })).toBeEnabled();
    await expect.element(page.getByLabelText(copy.lookup.nameLabel)).toHaveValue("Jane Smith");
    await expect.element(page.getByLabelText(copy.form.subjectLabel).nth(1)).toHaveValue(letterToPm.subject);
  });

  it("lets the next example have its turn when one goes before its own", async () => {
    const { rerender } = await render(<LetterWriteSignedExample />);
    await rerender(<EmailYourMpToolTestMpsExample />);
    await expect.element(page.getByLabelText(copy.lookup.nameLabel)).toHaveValue("Jane Smith");
    await expect.element(page.getByText(copy.lookup.testPostcodes, { exact: false })).toBeVisible();
  });

  it("stands in for Turnstile, whose token goes in the event log, going when it does", async () => {
    await render(<TurnstileExample />);
    await expect.element(page.getByText("Turnstile stand-in")).toBeVisible();
    await expect.element(page.getByRole("list", { name: "Event log" })).toHaveTextContent('onToken("fixture-token")');
  });

  it("sends the preview's letter only once the stand-in's token is in", async () => {
    await render(<LetterPreviewExample />);
    await expect.element(page.getByText("Turnstile stand-in")).toBeVisible();
    await expect.element(page.getByRole("button", { name: copy.preview.send })).toBeEnabled();
  });

  it("shows the editor's letter as text, as it's edited", async () => {
    await render(<LetterEditorExample />);
    await expect.element(editor()).toBeVisible();
    await userEvent.fill(editor(), "A new letter");
    await expect.element(page.getByText("Value: A new letter")).toBeVisible();
  });

  it("drafts the letter with and without attachments", async () => {
    await render(
      <>
        <LetterFormExample />
        <LetterFormNoAttachmentsExample />
      </>,
    );
    await expect.element(page.getByRole("list", { name: copy.form.attachments })).toBeVisible();
    expect(page.getByLabelText(copy.form.subjectLabel).all()).toHaveLength(2);
  });
});
