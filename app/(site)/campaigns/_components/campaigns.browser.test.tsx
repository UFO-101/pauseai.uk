import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { site } from "@/lib/content/site";
import CampaignContext from "./CampaignContext";
import CampaignDocs from "./CampaignDocs";
import CampaignsClient from "./CampaignsClient";
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
    await expect.element(page.getByRole("link", { name: /To the Prime Minister/ })).toHaveAttribute("href", "/pdfs/Frontier-AI-Open-Letter.pdf");
    await expect.element(page.getByRole("link", { name: /Frontier AI Risks/ })).toHaveAttribute("href", "/pdfs/Frontier-AI-Risks-Policy-Briefing.pdf");
  });

  it("embeds the email-your-MP form, with a link if it doesn't load", async () => {
    await render(<EmailYourMp />);
    await expect.element(page.getByTitle("Email your MP — PauseAI")).toBeInTheDocument();
    await expect.element(page.getByRole("link", { name: "Open it on pauseai.info →" })).toHaveAttribute("href", "https://pauseai.info/uk-email-mp");
  });

  it("lists signatories from Airtable when the site has a token, and Airtable's own embed otherwise", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("[]"));
    const { rerender } = await render(<Signatories listFromAirtable />);
    await expect.element(page.getByText("No signatories yet.")).toBeVisible();
    await rerender(<Signatories listFromAirtable={false} />);
    await expect.element(page.getByTitle("Parliamentary signatories to the Frontier AI open letter")).toBeInTheDocument();
    await expect.element(page.getByRole("link", { name: site.pressEmail })).toHaveAttribute("href", `mailto:${site.pressEmail}`);
  });

  it("offers a QR code for the page", async () => {
    await render(<ShareQr />);
    await expect.element(page.getByRole("button", { name: "Show QR code larger" })).toBeVisible();
  });
});

describe("SignatoriesList", () => {
  const respond = (body: unknown, status = 200) => vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

  it("says it is loading, then lists MPs and Lords separately", async () => {
    respond([
      { name: "Jane MP", party: "Labour", constituency: "Somewhere" },
      { name: "Sam MP", party: "", constituency: "Elsewhere" },
      { name: "Lord Example", party: "Crossbench", constituency: "" },
      { name: "Baroness Plain", party: "", constituency: "" },
    ]);
    const { container } = await render(<SignatoriesList />);
    expect(container.textContent).toBe("Loading signatories…");
    await expect.element(page.getByRole("heading", { name: "MPs" })).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Lords" })).toBeVisible();
    await expect.element(page.getByText("MP for Somewhere, Labour")).toBeVisible();
    await expect.element(page.getByText("MP for Elsewhere")).toBeVisible();
    await expect.element(page.getByText("Crossbench")).toBeVisible();
    // A Lord with no party has no subtitle.
    const plain = [...container.querySelectorAll(".signatories-item")].find((li) => li.textContent === "Baroness Plain");
    expect(plain?.querySelector(".signatories-subtitle")).toBeNull();
  });

  it("leaves out an empty group", async () => {
    respond([{ name: "Lord Only", party: "Crossbench", constituency: "" }]);
    await render(<SignatoriesList />);
    await expect.element(page.getByRole("heading", { name: "Lords" })).toBeVisible();
    expect(document.querySelector(".signatories-group h3")?.textContent).toBe("Lords");
    respond([{ name: "MP Only", party: "Green", constituency: "Here" }]);
    const second = await render(<SignatoriesList />);
    await expect.poll(() => second.container.querySelector("h3")?.textContent).toBe("MPs");
  });

  it("says so when the list can't be loaded", async () => {
    respond({ error: "nope" }, 502);
    await render(<SignatoriesList />);
    await expect.element(page.getByText("Couldn't load signatories right now — try refreshing.")).toBeVisible();
  });
});

describe("CampaignsClient", () => {
  const ORIGIN = "https://pauseai.info";
  const post = (data: unknown, origin = ORIGIN) => window.dispatchEvent(new MessageEvent("message", { data, origin }));

  function Page({ withCloseButton = true }: { withCloseButton?: boolean }) {
    return (
      <>
        <iframe id="campaigns-embed" title="embed" />
        <button className="qr-thumb">QR</button>
        <div className="qr-lightbox" id="qr-lightbox" aria-hidden="true" data-testid="lightbox">
          {withCloseButton && <button className="qr-lightbox-close">Close</button>}
          <span>Big QR</span>
        </div>
        <CampaignsClient />
      </>
    );
  }

  it("resizes the embed when pauseai.info asks, ignoring anything else", async () => {
    await render(<Page />);
    const iframe = document.getElementById("campaigns-embed") as HTMLIFrameElement;
    post({ type: "pauseai-embed-resize", height: 777 });
    expect(iframe.style.height).toBe("777px");
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
    expect(iframe.style.height).toBe("777px");
  });

  it("tells Google Tag Manager when an email to an MP is sent", async () => {
    await render(<Page />);
    const w = window as typeof window & { dataLayer?: unknown[] };
    delete w.dataLayer;
    post({ event: "mp_email_sent" });
    post({ event: "mp_email_sent" });
    expect(w.dataLayer).toEqual([{ event: "mp_email_sent" }, { event: "mp_email_sent" }]);
  });

  it("opens the QR code large, and closes it with the button, the backdrop or Escape", async () => {
    await render(<Page />);
    const lightbox = page.getByTestId("lightbox");
    const isOpen = () => lightbox.element().classList.contains("open");
    await page.getByRole("button", { name: "QR" }).click();
    expect(isOpen()).toBe(true);
    expect(lightbox.element().getAttribute("aria-hidden")).toBe("false");
    (lightbox.element().querySelector(".qr-lightbox-close") as HTMLElement).click();
    expect(isOpen()).toBe(false);

    await page.getByRole("button", { name: "QR" }).click();
    (lightbox.element().querySelector("span") as HTMLElement).click();
    expect(isOpen()).toBe(true);
    (lightbox.element() as HTMLElement).click();
    expect(isOpen()).toBe(false);

    await userEvent.keyboard("{Escape}");
    expect(isOpen()).toBe(false);
    await page.getByRole("button", { name: "QR" }).click();
    await userEvent.keyboard("{Enter}");
    expect(isOpen()).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(isOpen()).toBe(false);
  });

  it("works without a close button, and does nothing on a page without the embed or QR code", async () => {
    const { unmount } = await render(<Page withCloseButton={false} />);
    await page.getByRole("button", { name: "QR" }).click();
    await unmount();
    await render(<CampaignsClient />);
    post({ type: "pauseai-embed-resize", height: 5 });
  });
});
