import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { markSent } from "./draft";
import LetterSent from "./LetterSent";
import LetterStep from "./LetterStep";

const [letterToPm, bill] = campaigns;

afterEach(() => sessionStorage.clear());

describe("LetterSent", () => {
  it("thanks the sender for the letter just sent, naming the MP, under the page's heading", async () => {
    markSent({ campaign: letterToPm.slug, mpName: "Polly Placeholder" });
    await render(
      <LetterStep title={copy.sent.title}>
        <LetterSent campaignSlug={letterToPm.slug} />
      </LetterStep>,
    );
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent(copy.sent.title);
    await expect.element(page.getByRole("status")).toHaveTextContent(copy.sent.body("Polly Placeholder"));
    await expect.element(page.getByText(copy.sent.more)).toBeVisible();
  });

  it("says nothing's been sent for another campaign, or none at all, and links to the form", async () => {
    markSent({ campaign: letterToPm.slug, mpName: "Polly Placeholder" });
    await render(<LetterSent campaignSlug={bill.slug} />);
    await expect.element(page.getByText(copy.sent.none)).toBeVisible();
    await expect.element(page.getByRole("status")).not.toBeInTheDocument();
    await expect.element(page.getByText(copy.sent.more)).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: copy.preview.backToForm }))
      .toHaveAttribute("href", `/campaigns-v2/${bill.slug}#email-your-mp`);
  });
});
