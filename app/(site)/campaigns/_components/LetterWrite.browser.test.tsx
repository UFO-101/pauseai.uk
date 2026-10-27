import { CONTROLAI_LETTER_ASK } from "@/lib/asks";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { saveDraft, saveLookup } from "./draft";
import { exampleLookup, exampleMp } from "./draft.examples";
import LetterWrite from "./LetterWrite";

const [letterToPm, bill] = campaigns;
const MP = exampleMp;
const LOOKUP = exampleLookup;

afterEach(() => sessionStorage.clear());

const editor = () => page.getByRole("textbox", { name: copy.form.letterLabel, exact: true });

describe("LetterWrite", () => {
  it("shows the MP found, and the campaign's letter to them, from the sender", async () => {
    saveLookup(LOOKUP);
    await render(<LetterWrite campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByRole("heading", { name: "Polly Placeholder" })).toBeVisible();
    await expect.element(page.getByText(MP.email)).toBeVisible();
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue(letterToPm.subject);
    await expect.element(editor().getByText("Dear Ms Placeholder")).toBeVisible();
    await expect.element(page.getByText("1 High St", { exact: false })).toHaveTextContent("1 High StSW1A 1AA");
  });

  it("says so above the bill's letter when the MP signed ControlAI's letter, and nowhere else", async () => {
    saveLookup({ ...LOOKUP, campaign: bill.slug, statuses: { [CONTROLAI_LETTER_ASK]: "signed" } });
    const signed = await render(<LetterWrite campaignSlug={bill.slug} />);
    await expect.element(page.getByText(copy.sobelBill.signedNote.after, { exact: false })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.sobelBill.signedNote.link }))
      .toHaveAttribute("href", "https://controlai.org/uk-pm-letter");
    await expect.element(editor().getByText(copy.sobelBill.letterThanks)).toBeVisible();
    signed.unmount();

    saveLookup({ ...LOOKUP, campaign: bill.slug });
    const unsigned = await render(<LetterWrite campaignSlug={bill.slug} />);
    await expect.element(editor()).toBeVisible();
    await expect.element(page.getByText(copy.sobelBill.signedNote.after, { exact: false })).not.toBeInTheDocument();
    unsigned.unmount();

    saveLookup({ ...LOOKUP, statuses: { [CONTROLAI_LETTER_ASK]: "signed" } });
    await render(<LetterWrite campaignSlug={letterToPm.slug} />);
    await expect.element(editor()).toBeVisible();
    await expect.element(page.getByText(copy.sobelBill.signedNote.after, { exact: false })).not.toBeInTheDocument();
  });

  it("carries on with the draft, coming back from the preview", async () => {
    saveLookup(LOOKUP);
    saveDraft({
      ...LOOKUP,
      email: "jane@example.com",
      address: "1 High St",
      subject: "Kept subject",
      letter: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Kept letter" }] }] },
      nickname: "",
    });
    await render(<LetterWrite campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue("Kept subject");
    await expect.element(editor().getByText("Kept letter")).toBeVisible();
  });

  it("says to find the MP first, without a lookup for this campaign, and links to the form", async () => {
    saveLookup({ ...LOOKUP, campaign: bill.slug });
    await render(<LetterWrite campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByText(copy.write.none)).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.preview.backToForm }))
      .toHaveAttribute("href", `/campaigns/${letterToPm.slug}#email-your-mp`);
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).not.toBeInTheDocument();
  });
});
