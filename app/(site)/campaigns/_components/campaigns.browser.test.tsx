import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { site } from "@/lib/content/site";
import CampaignContext from "./CampaignContext";
import CampaignDocs from "./CampaignDocs";
import EmailYourMp from "./EmailYourMp";
import ShareQr from "./ShareQr";
import Signatories from "./Signatories";
import SignatoriesList from "./SignatoriesList";

// These sections embed pages from pauseai.info and Airtable. The tests check
// the frames are there, not what loads inside them.

afterEach(() => vi.restoreAllMocks());

describe("campaign sections", () => {
  it("makes the case, with the letter and briefing as PDFs", async () => {
    await render(
      <>
        <CampaignContext />
        <CampaignDocs />
      </>,
    );
    await expect.element(page.getByRole("heading", { name: "Read the case in full" })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: /To the Prime Minister/ }))
      .toHaveAttribute("href", "/pdfs/Frontier-AI-Open-Letter.pdf");
    await expect
      .element(page.getByRole("link", { name: /Frontier AI Risks/ }))
      .toHaveAttribute("href", "/pdfs/Frontier-AI-Risks-Policy-Briefing.pdf");
  });

  it("embeds the email-your-MP form, with a link if it doesn't load", async () => {
    await render(<EmailYourMp />);
    await expect.element(page.getByTitle("Email your MP — PauseAI")).toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: "Open it on pauseai.info →" }))
      .toHaveAttribute("href", "https://pauseai.info/uk-email-mp");
  });

  it("lists the signatories, with a note for journalists", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("[]"));
    await render(<Signatories />);
    await expect.element(page.getByText("No signatories yet.")).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: site.pressEmail }))
      .toHaveAttribute("href", `mailto:${site.pressEmail}`);
  });

  it("offers a QR code for the page", async () => {
    await render(<ShareQr />);
    await expect.element(page.getByRole("button", { name: "Show QR code larger" })).toBeVisible();
  });
});

describe("SignatoriesList", () => {
  const respond = (body: unknown, status = 200) =>
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

  it("says it is loading, then lists each house separately", async () => {
    respond([
      { name: "Jane MP", party: "Labour", constituency: "Somewhere", house: "commons" },
      { name: "Sam MP", party: "", constituency: "Elsewhere", house: "commons" },
      { name: "Lord Example", party: "Crossbench", constituency: "", house: "lords" },
      { name: "Baroness Plain", party: "", constituency: "", house: "lords" },
      { name: "Jo MSP", party: "SNP", constituency: "Glasgow Kelvin", house: "scottish-parliament" },
    ]);
    const { container } = await render(<SignatoriesList />);
    expect(container.textContent).toBe("Loading signatories…");
    await expect.element(page.getByRole("heading", { name: "MPs" })).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Lords" })).toBeVisible();
    await expect.element(page.getByText("MP for Somewhere, Labour")).toBeVisible();
    await expect.element(page.getByText("MP for Elsewhere")).toBeVisible();
    await expect.element(page.getByText("Crossbench")).toBeVisible();
    // Signers outside Westminster show where they sit, without "MP for".
    await expect.element(page.getByText("Glasgow Kelvin, SNP")).toBeVisible();
    expect(container.querySelectorAll(".signatories-group h3")).toHaveLength(3);
    // A Lord with no party has no subtitle.
    const plain = [...container.querySelectorAll(".signatories-item")].find(
      (li) => li.textContent === "Baroness Plain",
    );
    expect(plain?.querySelector(".signatories-subtitle")).toBeNull();
  });

  it("leaves out an empty group", async () => {
    respond([{ name: "Lord Only", party: "Crossbench", constituency: "", house: "lords" }]);
    await render(<SignatoriesList />);
    await expect.element(page.getByRole("heading", { name: "Lords" })).toBeVisible();
    expect(document.querySelector(".signatories-group h3")?.textContent).toBe("Lords");
    respond([{ name: "MP Only", party: "Green", constituency: "Here", house: "commons" }]);
    const second = await render(<SignatoriesList />);
    await expect.poll(() => second.container.querySelector("h3")?.textContent).toBe("MPs");
  });

  it("says so when the list can't be loaded", async () => {
    respond({ error: "nope" }, 502);
    await render(<SignatoriesList />);
    await expect.element(page.getByText("Couldn't load signatories right now — try refreshing.")).toBeVisible();
  });
});

describe("EmailYourMp's embed", () => {
  const ORIGIN = "https://pauseai.info";
  const post = (data: unknown, origin = ORIGIN) => window.dispatchEvent(new MessageEvent("message", { data, origin }));

  it("resizes when pauseai.info asks, ignoring anything else", async () => {
    await render(<EmailYourMp />);
    const iframe = page.getByTitle("Email your MP — PauseAI");
    expect((iframe.element() as HTMLIFrameElement).style.height).toBe("");
    post({ type: "pauseai-embed-resize", height: 777 });
    await expect.element(iframe).toHaveStyle({ height: "777px" });
    for (const [data, origin] of [
      [{ type: "pauseai-embed-resize", height: 1 }, "https://evil.example"],
      [null, ORIGIN],
      ["text", ORIGIN],
      [{ type: "something-else", height: 2 }, ORIGIN],
      [{ type: "pauseai-embed-resize", height: "3" }, ORIGIN],
      [{ type: "pauseai-embed-resize", height: Infinity }, ORIGIN],
    ] as const) {
      post(data, origin);
    }
    await expect.element(iframe).toHaveStyle({ height: "777px" });
  });

  it("tells Google Tag Manager when an email to an MP is sent", async () => {
    await render(<EmailYourMp />);
    const w = window as typeof window & { dataLayer?: unknown[] };
    delete w.dataLayer;
    post({ event: "mp_email_sent" });
    post({ event: "mp_email_sent" });
    expect(w.dataLayer).toEqual([{ event: "mp_email_sent" }, { event: "mp_email_sent" }]);
  });

  it("stops listening when it goes", async () => {
    const { unmount } = await render(<EmailYourMp />);
    await unmount();
    const w = window as typeof window & { dataLayer?: unknown[] };
    delete w.dataLayer;
    post({ event: "mp_email_sent" });
    expect(w.dataLayer).toBeUndefined();
  });
});

describe("ShareQr", () => {
  const dialog = () => page.getByRole("dialog", { name: "QR code" });

  it("opens the QR code large, and closes it with the button, the backdrop or Escape", async () => {
    await render(<ShareQr />);
    await expect.element(dialog()).not.toBeInTheDocument();
    await page.getByRole("button", { name: "Show QR code larger" }).click();
    await expect.element(dialog()).toHaveClass("qr-lightbox open");
    // Hidden until it has loaded, so it fades in. Next's image optimiser
    // isn't here to serve it, so say it has loaded.
    const code = dialog().getByRole("img");
    await expect.element(code).toHaveClass("is-loading");
    code.element().dispatchEvent(new Event("load"));
    await expect.element(code).not.toHaveClass("is-loading");
    await page.getByRole("button", { name: "Close" }).click();
    await expect.element(dialog()).not.toBeInTheDocument();

    // A click on the code itself leaves it open; one on the backdrop closes it.
    await page.getByRole("button", { name: "Show QR code larger" }).click();
    (dialog().element().querySelector("img") as HTMLElement).click();
    await expect.element(dialog()).toBeInTheDocument();
    (dialog().element() as HTMLElement).click();
    await expect.element(dialog()).not.toBeInTheDocument();

    await page.getByRole("button", { name: "Show QR code larger" }).click();
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(dialog()).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog()).not.toBeInTheDocument();
  });
});
