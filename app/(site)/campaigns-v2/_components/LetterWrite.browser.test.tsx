import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { saveDraft, saveLookup, type Lookup } from "./draft";
import LetterWrite from "./LetterWrite";

const [letterToPm, bill] = campaigns;
const MP = { name: "Polly Placeholder", salutation: "Ms Placeholder", constituency: "Cities of London and Westminster", email: "polly.placeholder.mp@parliament.uk" };
const LOOKUP: Lookup = { campaign: letterToPm.slug, name: "Jane Smith", postcode: "SW1A 1AA", mp: MP, statuses: {} };

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
    await expect.element(page.getByText(letterToPm.movedOn)).not.toBeInTheDocument();
  });

  it("says why, when another campaign's page moved on to this one", async () => {
    saveLookup({ ...LOOKUP, campaign: bill.slug, statuses: { [letterToPm.slug]: "signed" }, movedFrom: letterToPm.slug });
    await render(<LetterWrite campaignSlug={bill.slug} />);
    await expect.element(page.getByText(letterToPm.movedOn)).toBeVisible();
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).toHaveValue(bill.subject);
  });

  it("carries on with the draft, coming back from the preview, without the note", async () => {
    saveLookup({ ...LOOKUP, movedFrom: bill.slug });
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
    await expect.element(page.getByText(bill.movedOn)).not.toBeInTheDocument();
  });

  it("says to find the MP first, without a lookup for this campaign, and links to the form", async () => {
    saveLookup({ ...LOOKUP, campaign: bill.slug });
    await render(<LetterWrite campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByText(copy.write.none)).toBeVisible();
    await expect.element(page.getByRole("link", { name: copy.preview.backToForm })).toHaveAttribute("href", `/campaigns-v2/${letterToPm.slug}#email-your-mp`);
    await expect.element(page.getByLabelText(copy.form.subjectLabel)).not.toBeInTheDocument();
  });
});
