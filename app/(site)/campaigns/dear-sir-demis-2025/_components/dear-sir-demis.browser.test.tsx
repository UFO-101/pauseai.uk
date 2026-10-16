import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { campaigns } from "@/lib/content/email-your-mp";
import DemisLetterBackground from "./DemisLetterBackground";
import DemisLetterHelp from "./DemisLetterHelp";
import DemisLetterHero from "./DemisLetterHero";
import DemisLetterQuotes from "./DemisLetterQuotes";
import DemisLetterSignatories from "./DemisLetterSignatories";
import DemisLetterText from "./DemisLetterText";

describe("the letter to Sir Demis Hassabis", () => {
  it("heads the page with who signed, in numbers, and the date", async () => {
    await render(<DemisLetterHero />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Letter to Sir Demis Hassabis");
    await expect.element(page.getByRole("term").filter({ hasText: "Parliamentarians" })).toBeVisible();
    await expect.element(page.getByRole("definition").filter({ hasText: "63" })).toBeVisible();
    await expect.element(page.getByRole("definition").filter({ hasText: /^4$/ })).toBeVisible();
    await expect.element(page.getByText("29 August 2025")).toHaveAttribute("datetime", "2025-08-29");
  });

  it("quotes six signatories, each with their portrait", async () => {
    await render(<DemisLetterQuotes />);
    await expect.element(page.getByRole("heading", { name: /What parliamentarians are saying/ })).toBeVisible();
    await expect.element(page.getByText("The Lord Bishop of Oxford")).toBeVisible();
    expect(page.getByRole("figure").elements()).toHaveLength(6);
    await expect.element(page.getByRole("img", { name: "Portrait of Right Revd Dr Steven Croft" })).toBeVisible();
  });

  it("gives the letter in full", async () => {
    await render(<DemisLetterText />);
    await expect.element(page.getByText("Dear Sir Demis,")).toBeVisible();
    await expect.element(page.getByText("Yours sincerely,")).toBeVisible();
    expect(page.getByRole("listitem").elements()).toHaveLength(6);
  });

  it("lists the parliamentarians with their portraits, then the organisations' logos, linked", async () => {
    await render(<DemisLetterSignatories />);
    await expect.element(page.getByRole("heading", { name: "63 Signatories" })).toBeVisible();
    await expect.element(page.getByRole("img", { name: "Portrait of Baroness Kidron" })).toBeVisible();
    await expect.element(page.getByText("Peer").first()).toBeVisible();
    const logo = page.getByRole("link", { name: "Open Rights Group logo" });
    await expect.element(logo).toHaveAttribute("href", "https://www.openrightsgroup.org/");
    await expect.element(logo).toHaveAttribute("target", "_blank");
  });

  it("shows initials for a signatory without a portrait, and an organisation's name without a logo or link", async () => {
    await render(
      <DemisLetterSignatories
        parliamentarians={[{ name: "Jane Bloggs MP", type: "MP" }]}
        organisations={[{ name: "Somebody New", website: null, logo: null }]}
      />,
    );
    await expect.element(page.getByText("JB")).toBeVisible();
    await expect.element(page.getByText("Somebody New")).toBeVisible();
    await expect.element(page.getByRole("link")).not.toBeInTheDocument();
  });

  it("leaves out the organisations when there are none", async () => {
    await render(<DemisLetterSignatories parliamentarians={[]} organisations={[]} />);
    await expect.element(page.getByRole("heading", { name: "0 Signatories" })).toBeVisible();
    expect(page.getByRole("list").elements()).toHaveLength(1);
  });

  it("links the background information as a PDF", async () => {
    await render(<DemisLetterBackground />);
    await expect
      .element(page.getByRole("link", { name: "Background Information" }))
      .toHaveAttribute("href", "/pdfs/PauseAI-Open-Letter-Background-Information.pdf");
  });

  it("sends visitors to email their MP in the campaign running now, and says who to contact", async () => {
    await render(<DemisLetterHelp />);
    const button = page.getByRole("link", { name: /Email your MP/ });
    await expect.element(button).toHaveAttribute("href", `/campaigns/${campaigns[0].slug}`);
    await expect.element(button).toHaveTextContent(`Email your MP →${campaigns[0].title}`);
    await expect
      .element(page.getByRole("link", { name: "Joseph Miller at joseph@pauseai.info" }))
      .toHaveAttribute("href", "mailto:joseph@pauseai.info");
  });
});
