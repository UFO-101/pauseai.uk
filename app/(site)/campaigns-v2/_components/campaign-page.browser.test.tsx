import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import CampaignContext from "./CampaignContext";
import CampaignDocs, { DocCard } from "./CampaignDocs";
import CampaignHero from "./CampaignHero";
import CampaignQr from "./CampaignQr";
import { saveLookup } from "./draft";
import EmailYourMpSection from "./EmailYourMpSection";

const [letterToPm, bill] = campaigns;
const MP = { name: "Polly Placeholder", salutation: "Ms Placeholder", constituency: "Cities of London and Westminster", email: "polly.placeholder.mp@parliament.uk" };

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("a campaign page's sections", () => {
  it("heads the page, with a button down to the form", async () => {
    await render(<CampaignHero title="Regulate AI developers now" campaignSlug={letterToPm.slug} />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Regulate AI developers now");
    await expect.element(page.getByRole("link", { name: "Email your MP →" })).toHaveAttribute("href", "#email-your-mp");
    await expect.element(page.getByText(letterToPm.movedOn)).not.toBeInTheDocument();
  });

  it("says why, above the heading, when another campaign's page moved on to this one", async () => {
    saveLookup({ campaign: bill.slug, name: "Jane Smith", postcode: "SW1A 1AA", mp: MP, statuses: { [letterToPm.slug]: "signed" }, movedFrom: letterToPm.slug });
    await render(<CampaignHero title="The bill" campaignSlug={bill.slug} />);
    await expect.element(page.getByText(letterToPm.movedOn)).toBeVisible();
  });

  it("doesn't, once the sender has found their MP from this page", async () => {
    saveLookup({ campaign: bill.slug, name: "Jane Smith", postcode: "SW1A 1AA", mp: MP, statuses: {} });
    await render(<CampaignHero title="The bill" campaignSlug={bill.slug} />);
    await expect.element(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.element(page.getByText(letterToPm.movedOn)).not.toBeInTheDocument();
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
