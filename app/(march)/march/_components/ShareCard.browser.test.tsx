import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { AI_IMPACTS_SURVEY_URL, marchSignupCopy } from "@/lib/content/march-signup";
import MarchSignupFrame from "./MarchSignupFrame";
import ShareCard, { appRowFade } from "./ShareCard";

const copy = marchSignupCopy.share;

/** matchMedia, with the given query matching and the rest as they are. */
function mediaMatching(match: string) {
  const real = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === match
      ? ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList)
      : real(query),
  );
}

type DataLayerWindow = Window & { dataLayer?: unknown[] };

/** What the card has pushed onto GTM's dataLayer. */
const pushed = () => (window as DataLayerWindow).dataLayer ?? [];

const shareEvent = (share_method: string) => ({ event: "march_share", share_method });

async function renderCard(onFinish = () => {}) {
  return render(
    <MarchSignupFrame>
      <ShareCard onFinish={onFinish} motion="still" onLeft={() => {}} />
    </MarchSignupFrame>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as DataLayerWindow).dataLayer;
});

describe("appRowFade", () => {
  it("fades whichever ends have more icons past them", () => {
    expect(appRowFade({ scrollLeft: 0, clientWidth: 100, scrollWidth: 100 })).toBe("none");
    expect(appRowFade({ scrollLeft: 0, clientWidth: 100, scrollWidth: 300 })).toBe("end");
    expect(appRowFade({ scrollLeft: 100, clientWidth: 100, scrollWidth: 300 })).toBe("both");
    expect(appRowFade({ scrollLeft: 200, clientWidth: 100, scrollWidth: 300 })).toBe("start");
  });
});

describe("ShareCard", () => {
  it("says why to share, linking the 18% to the survey, in bold", async () => {
    await renderCard();
    await expect.element(page.getByRole("heading", { name: "Double your impact" })).toBeVisible();
    const link = page.getByRole("link", { name: "18% chance" });
    await expect.element(link).toHaveAttribute("href", AI_IMPACTS_SURVEY_URL);
    expect(link.element().querySelector("strong")).not.toBeNull();
    await expect.element(page.getByText(copy.plea.bold)).toBeVisible();
    expect(page.getByText(copy.plea.bold).element().tagName).toBe("STRONG");
  });

  it("links to each place to post the message, with the link to the sign-up in it", async () => {
    await renderCard();
    await expect
      .element(page.getByRole("link", { name: "WhatsApp" }))
      .toHaveAttribute("href", `https://wa.me/?text=${encodeURIComponent(copy.message)}`);
    expect(copy.message).toContain("https://pauseai.uk/march?utm_source=sh");
    await expect
      .element(page.getByRole("link", { name: "Facebook" }))
      .toHaveAttribute(
        "href",
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://pauseai.uk/march?utm_source=sh")}`,
      );
    expect(page.getByRole("list").getByRole("link").all()).toHaveLength(9);
  });

  it("tags every app's link the same, as a share, with one tag", async () => {
    await renderCard();
    for (const link of page.getByRole("list").getByRole("link").all()) {
      const href = decodeURIComponent(link.element().getAttribute("href")!);
      expect(href.match(/https:\/\/pauseai\.uk\/march\S*/)![0]).toMatch(
        /^https:\/\/pauseai\.uk\/march\?utm_source=sh(&|$)/,
      );
    }
  });

  it("tells Google Tag Manager which app the message went to", async () => {
    await renderCard();
    const whatsapp = page.getByRole("link", { name: "WhatsApp" }).element();
    // Pressed, but not followed: the test stays on its page.
    whatsapp.addEventListener("click", (e) => e.preventDefault());
    (whatsapp as HTMLElement).click();
    expect(pushed()).toEqual([shareEvent("whatsapp")]);
  });

  it("sends X, Bluesky and Threads the short message, inside their limits, and the rest the whole one", async () => {
    await renderCard();
    const text = (name: string, param: string) =>
      new URL(page.getByRole("link", { name, exact: true }).element().getAttribute("href")!).searchParams.get(param);
    expect(text("X", "text")).toBe(copy.shortMessage);
    expect(text("Bluesky", "text")).toBe(copy.shortMessage);
    expect(text("Threads", "text")).toBe(copy.shortMessage);
    expect(text("WhatsApp", "text")).toBe(copy.message);
    expect(text("Telegram", "url")).toBe(copy.message);
    expect(text("Email", "body")).toBe(copy.message);
    expect(copy.message.endsWith(copy.shortMessage)).toBe(true);
    expect([...copy.shortMessage].length).toBeLessThanOrEqual(280);
  });

  it("has the share button at the foot of the card, under the places to post", async () => {
    await renderCard();
    const apps = page.getByRole("list").element().getBoundingClientRect();
    const button = page.getByRole("button", { name: copy.copy }).element().getBoundingClientRect();
    expect(button.top).toBeGreaterThan(apps.bottom);
  });

  it("fades the app row's end on a narrow screen, and its start once scrolled", async () => {
    await page.viewport(400, 800);
    await renderCard();
    const row = page.getByRole("list").element() as HTMLElement;
    await expect.poll(() => row.dataset.fade).toBe("end");
    row.scrollLeft = 60;
    await expect.poll(() => row.dataset.fade).toBe("both");
    row.scrollLeft = row.scrollWidth;
    await expect.poll(() => row.dataset.fade).toBe("start");
    await page.viewport(1280, 900);
  });

  it("copies the message and says so for a moment", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await renderCard();
    await page.getByRole("button", { name: copy.copy }).click();
    expect(writeText).toHaveBeenCalledWith(copy.message);
    expect(copy.message).toContain("https://pauseai.uk/march?utm_source=sh");
    await expect.poll(pushed).toEqual([shareEvent("copy")]);
    await expect.element(page.getByRole("button", { name: copy.copied })).toBeVisible();
    await expect.element(page.getByRole("button", { name: copy.copy }), { timeout: 4000 }).toBeVisible();
  });

  it("doesn't say it copied when it couldn't", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await renderCard();
    await page.getByRole("button", { name: copy.copy }).click();
    await expect.element(page.getByRole("button", { name: copy.copy })).toBeVisible();
    expect(pushed()).toEqual([]);
  });

  it("offers the share sheet on a touch screen, with copying beside it", async () => {
    mediaMatching("(pointer: coarse)");
    const share = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("cancelled"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    try {
      await renderCard();
      await page.getByRole("button", { name: copy.share, exact: true }).click();
      expect(share).toHaveBeenCalledWith({ title: copy.emailSubject, text: copy.message });
      await expect.poll(pushed).toEqual([shareEvent("share_sheet")]);
      // Closing the sheet shares nothing, so tells GTM nothing.
      await page.getByRole("button", { name: copy.share, exact: true }).click();
      await expect.poll(() => share.mock.calls.length).toBe(2);
      expect(pushed()).toHaveLength(1);
      await expect.element(page.getByRole("button", { name: copy.copy })).toBeVisible();
    } finally {
      delete (navigator as { share?: unknown }).share;
    }
  });

  it("renders on the server with no share sheet", () => {
    const html = renderToString(<ShareCard onFinish={() => {}} motion="still" onLeft={() => {}} />);
    expect(html).toContain(copy.copy);
    expect(html).not.toContain(`${copy.share}<`);
  });

  it("moves on when they can't think of anywhere else", async () => {
    const onFinish = vi.fn();
    await renderCard(onFinish);
    await page.getByRole("button", { name: copy.finish }).click();
    expect(onFinish).toHaveBeenCalledOnce();
  });
});
