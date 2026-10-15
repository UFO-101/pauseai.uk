import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { navigation } from "@/tests/browser/navigation";
import { readDraft, type Draft } from "./draft";
import LetterForm from "./LetterForm";

const [letterToPm, bill] = campaigns;
const MP = { name: "Polly Placeholder", salutation: "Ms Placeholder", constituency: "Cities of London and Westminster", email: "polly.placeholder.mp@parliament.uk" };
const PROPS = { campaign: letterToPm, mp: MP, statuses: {}, senderName: "Jane Smith", postcode: "sw1a 1aa" };
const PREVIEW = `/campaigns-v2/${letterToPm.slug}/preview`;

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

const editor = () => page.getByRole("textbox", { name: copy.form.letterLabel, exact: true });

async function fillAndPreview(email = "jane@example.com") {
  await userEvent.fill(page.getByLabelText(copy.form.emailLabel), email);
  await userEvent.fill(page.getByRole("textbox", { name: copy.form.addressLabel }), "1 High St\nLondon");
  await page.getByRole("button", { name: copy.form.preview }).click();
}

describe("LetterForm", () => {
  it("drafts the letter for the MP, and says the address goes in it", async () => {
    await render(<LetterForm {...PROPS} />);
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue(letterToPm.subject);
    await expect.element(editor().getByText("Dear Ms Placeholder")).toBeVisible();
    await expect.element(editor().getByText(/^I’m a resident of Cities of London and Westminster and a supporter of/)).toBeVisible();
    // The old tool's bold.
    expect(editor().getByText("PauseAI", { exact: true }).element().tagName).toBe("STRONG");
    await expect.element(page.getByRole("textbox", { name: copy.form.addressLabel })).toHaveAccessibleDescription(copy.form.addressHint);
    // The signature is only shown on the preview, in the letter.
    await expect.element(page.getByText("Jane Smith SW1A 1AA")).not.toBeInTheDocument();
    for (const attachment of letterToPm.attachments) {
      await expect.element(page.getByRole("link", { name: attachment.file })).toHaveAttribute("href", `/pdfs/${attachment.file}`);
    }
  });

  it("leaves out attachments when there are none", async () => {
    await render(<LetterForm {...PROPS} campaign={bill} />);
    await expect.element(page.getByText(copy.form.attachments)).not.toBeInTheDocument();
  });

  it("keeps what the sender wrote as the draft, and goes to the preview", async () => {
    await render(<LetterForm {...PROPS} />);
    await userEvent.fill(page.getByLabelText(copy.form.subjectLabel), "My subject");
    await userEvent.fill(editor(), "My letter");
    await fillAndPreview(" jane@example.com ");

    await vi.waitFor(() => expect(navigation.pushed).toEqual([PREVIEW]));
    expect(readDraft(letterToPm.slug)).toEqual({
      campaign: letterToPm.slug,
      name: "Jane Smith",
      postcode: "sw1a 1aa",
      mp: MP,
      statuses: {},
      email: "jane@example.com",
      address: "1 High St\nLondon",
      subject: "My subject",
      letter: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "My letter" }] }] },
      nickname: "",
    });
  });

  it("lets the sender use bold, italic and bullets, and keeps them", async () => {
    await render(<LetterForm {...PROPS} />);
    await userEvent.fill(editor(), "Hello");
    await userEvent.keyboard("{Enter}");
    const bold = page.getByRole("button", { name: "Bold" });
    await bold.click();
    await expect.element(bold).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Italic" }).click();
    await userEvent.keyboard("Loud");
    await page.getByRole("button", { name: "Bullet point" }).click();
    await expect.element(page.getByRole("button", { name: "Bullet point" })).toHaveAttribute("aria-pressed", "true");
    await fillAndPreview();

    await vi.waitFor(() => expect(navigation.pushed).toEqual([PREVIEW]));
    expect(readDraft(letterToPm.slug)!.letter).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Loud", marks: [{ type: "bold" }, { type: "italic" }] }] }] }] },
      ],
    });
  });

  it("needs an email that looks like one, and an address, before the preview", async () => {
    await render(<LetterForm {...PROPS} />);
    await page.getByRole("button", { name: copy.form.preview }).click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.form.emailRequired);
    await userEvent.fill(page.getByLabelText(copy.form.emailLabel), "jane");
    await page.getByRole("button", { name: copy.form.preview }).click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.errors.invalidEmail);
    await userEvent.fill(page.getByLabelText(copy.form.emailLabel), "jane@example.com");
    await page.getByRole("button", { name: copy.form.preview }).click();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.form.addressRequired);
    expect(navigation.pushed).toEqual([]);

    await userEvent.fill(page.getByRole("textbox", { name: copy.form.addressLabel }), "1 High St");
    await page.getByRole("button", { name: copy.form.preview }).click();
    await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
    expect(navigation.pushed).toEqual([PREVIEW]);
  });

  it("says so, and stays, if the browser won't keep the draft", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    await render(<LetterForm {...PROPS} />);
    await fillAndPreview();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.form.storageFailed);
    expect(navigation.pushed).toEqual([]);
  });

  it("carries on with a draft, coming back from the preview", async () => {
    const draft: Draft = {
      campaign: letterToPm.slug,
      name: "Jane Smith",
      postcode: "sw1a 1aa",
      mp: MP,
      statuses: {},
      email: "jane@example.com",
      address: "1 High St",
      subject: "Kept subject",
      letter: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Kept letter" }] }] },
      nickname: "",
    };
    await render(<LetterForm {...PROPS} draft={draft} />);
    await expect.element(page.getByLabelText(copy.form.emailLabel)).toHaveValue("jane@example.com");
    await expect.element(page.getByRole("textbox", { name: copy.form.addressLabel })).toHaveValue("1 High St");
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue("Kept subject");
    await expect.element(editor().getByText("Kept letter")).toBeVisible();
  });

  it("doesn't submit or reload when Enter is pressed in a field", async () => {
    await render(<LetterForm {...PROPS} />);
    await userEvent.type(page.getByLabelText(copy.form.emailLabel), "jane@example.com{Enter}");
    await expect.element(page.getByRole("button", { name: copy.form.preview })).toBeVisible();
    expect(navigation.pushed).toEqual([]);
  });

  it("passes on what a bot puts in the hidden field", async () => {
    await render(<LetterForm {...PROPS} />);
    await userEvent.fill(page.getByRole("textbox", { name: "Nickname", includeHidden: true }), "bot");
    await fillAndPreview();
    await vi.waitFor(() => expect(navigation.pushed).toEqual([PREVIEW]));
    expect(readDraft(letterToPm.slug)!.nickname).toBe("bot");
  });
});
