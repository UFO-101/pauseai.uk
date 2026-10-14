import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { copy } from "@/lib/content/email-your-mp";
import CampaignContext from "./CampaignContext";
import CampaignDocs, { DocCard } from "./CampaignDocs";
import CampaignHero from "./CampaignHero";
import CampaignQr from "./CampaignQr";
import EmailYourMpSection from "./EmailYourMpSection";

afterEach(() => vi.restoreAllMocks());

describe("a campaign page's sections", () => {
  it("heads the page, with a button down to the form", async () => {
    await render(<CampaignHero title="Regulate AI developers now" />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Regulate AI developers now");
    await expect.element(page.getByRole("link", { name: "Email your MP →" })).toHaveAttribute("href", "#email-your-mp");
  });

  it("makes the case, with the documents behind it as PDFs", async () => {
    await render(
      <>
        <CampaignContext>
          <p>Why it matters.</p>
        </CampaignContext>
        <CampaignDocs>
          <DocCard file="Frontier-AI-Open-Letter.pdf" kind="Open letter" title="To the Prime Minister" cta="Read the letter →" />
        </CampaignDocs>
      </>,
    );
    await expect.element(page.getByText("Why it matters.")).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Read the case in full" })).toBeVisible();
    const card = page.getByRole("link", { name: /To the Prime Minister/ });
    await expect.element(card).toHaveAttribute("href", "/pdfs/Frontier-AI-Open-Letter.pdf");
    expect(card.element().querySelector("img")!.getAttribute("src")).toContain("Frontier-AI-Open-Letter.jpg");
  });

  it("has the form where the hero's button goes", async () => {
    const { container } = await render(<EmailYourMpSection campaignSlug="regulate-letter-pm" />);
    expect(container.querySelector("#email-your-mp")).not.toBeNull();
    await expect.element(page.getByRole("heading", { name: "Email your MP" })).toBeVisible();
    await expect.element(page.getByLabelText(copy.lookup.postcodeLabel)).toBeVisible();
  });

  it("offers a QR code for the page", async () => {
    await render(<CampaignQr />);
    await expect.element(page.getByRole("button", { name: "Show QR code larger" })).toBeVisible();
  });
});
