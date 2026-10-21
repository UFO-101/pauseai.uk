import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { marchSignupCopy } from "@/lib/content/march-signup";
import MarchSignupFrame from "./MarchSignupFrame";
import ShareActions, { appRowFade, parseShareProgress, resetShareProgress } from "./ShareActions";

const copy = marchSignupCopy.share;
const KEY = "march-share";
const stored = () => JSON.parse(localStorage.getItem(KEY)!);
const finishButton = () => page.getByRole("button", { name: copy.finish });
const nudge = () => page.getByRole("status");
const thanks = () => page.getByRole("heading", { name: "Thank you for registering" });

/** matchMedia, with the given queries matching and the rest as they are. */
function mediaMatching(...queries: string[]) {
  const real = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    const list = real(query);
    return queries.includes(query)
      ? ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList)
      : list;
  });
}

async function renderCard() {
  return render(
    <MarchSignupFrame>
      <ShareActions />
    </MarchSignupFrame>,
  );
}

beforeEach(() => {
  localStorage.clear();
  resetShareProgress();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("parseShareProgress", () => {
  it("reads a stored progress, and starts again from anything else", () => {
    expect(parseShareProgress(null)).toEqual({ count: 0, done: false });
    expect(parseShareProgress('{"count":2.7,"done":true}')).toEqual({ count: 2, done: true });
    expect(parseShareProgress('{"count":-1,"done":"yes"}')).toEqual({ count: 0, done: false });
    expect(parseShareProgress('{"count":"3"}')).toEqual({ count: 0, done: false });
    expect(parseShareProgress("not json")).toEqual({ count: 0, done: false });
  });
});

describe("appRowFade", () => {
  it("fades whichever ends have more icons past them", () => {
    expect(appRowFade({ scrollLeft: 0, clientWidth: 100, scrollWidth: 100 })).toBe("none");
    expect(appRowFade({ scrollLeft: 0, clientWidth: 100, scrollWidth: 300 })).toBe("end");
    expect(appRowFade({ scrollLeft: 100, clientWidth: 100, scrollWidth: 300 })).toBe("both");
    expect(appRowFade({ scrollLeft: 200, clientWidth: 100, scrollWidth: 300 })).toBe("start");
  });
});

describe("ShareActions", () => {
  it("links to each place to post the message, with the link to the sign-up in it", async () => {
    await renderCard();
    await expect
      .element(page.getByRole("link", { name: "WhatsApp" }))
      .toHaveAttribute("href", `https://wa.me/?text=${encodeURIComponent(copy.message)}`);
    expect(copy.message).toContain("https://pauseai.uk/march");
    await expect
      .element(page.getByRole("link", { name: "Facebook" }))
      .toHaveAttribute("href", "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fpauseai.uk%2Fmarch");
    expect(page.getByRole("list").getByRole("link").all()).toHaveLength(9);
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

  it("copies the message, says so for a moment, and asks where else", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await renderCard();
    await page.getByRole("button", { name: copy.copy }).click();
    expect(writeText).toHaveBeenCalledWith(copy.message);
    await expect.element(page.getByRole("button", { name: copy.copied })).toBeVisible();
    await expect.element(nudge()).toHaveTextContent(`${copy.nudgeTitle}${copy.nudge}`);
    expect(stored()).toEqual({ count: 1, done: false });
    await expect.element(page.getByRole("button", { name: copy.copy }), { timeout: 4000 }).toBeVisible();
  });

  it("doesn't say it copied when it couldn't", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await renderCard();
    await page.getByRole("button", { name: copy.copy }).click();
    await expect.element(page.getByRole("button", { name: copy.copy })).toBeVisible();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("asks where else when they come back from posting, not before", async () => {
    await renderCard();
    const link = page.getByRole("link", { name: "Telegram" }).element() as HTMLAnchorElement;
    // The link would open a tab: only its click matters here.
    link.addEventListener("click", (event) => event.preventDefault());
    window.dispatchEvent(new Event("focus"));
    link.click();
    expect(stored()).toEqual({ count: 1, done: false });
    const hidden = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await expect.element(nudge()).not.toBeInTheDocument();
    hidden.mockRestore();
    window.dispatchEvent(new Event("focus"));
    await expect.element(nudge()).toBeVisible();
  });

  it("asks at once after an email, which never leaves the page", async () => {
    await renderCard();
    const link = page.getByRole("link", { name: "Email" }).element() as HTMLAnchorElement;
    link.addEventListener("click", (event) => event.preventDefault());
    link.click();
    await expect.element(nudge()).toBeVisible();
  });

  it("offers the share sheet on a touch screen, with copying beside it", async () => {
    mediaMatching("(pointer: coarse)");
    const share = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("cancelled"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    try {
      await renderCard();
      await page.getByRole("button", { name: copy.share, exact: true }).click();
      expect(share).toHaveBeenCalledWith({ title: copy.title, text: copy.message });
      await expect.element(nudge()).toBeVisible();
      await page.getByRole("button", { name: copy.share, exact: true }).click();
      await expect.poll(() => share.mock.calls.length).toBe(2);
      expect(stored()).toEqual({ count: 1, done: false });
      await expect.element(page.getByRole("button", { name: copy.copy })).toBeVisible();
    } finally {
      delete (navigator as { share?: unknown }).share;
    }
  });

  it("swaps the card for a thank-you when they've shared all they can, and remembers", async () => {
    const { unmount } = await renderCard();
    await finishButton().click();
    await expect.element(thanks()).toBeVisible();
    await expect.poll(() => document.activeElement).toBe(thanks().element());
    expect(stored()).toEqual({ count: 0, done: true });
    await expect.element(page.getByRole("link", { name: "PauseAI UK" })).toHaveAttribute("href", "/");
    await unmount();

    await renderCard();
    await expect.element(thanks()).toBeVisible();
    expect(document.activeElement).not.toBe(thanks().element());
  });

  it("swaps at once with reduced motion", async () => {
    mediaMatching("(prefers-reduced-motion: reduce)");
    await renderCard();
    await finishButton().click();
    await expect.element(thanks()).toBeVisible();
  });

  it("waits for the card's own animation, not one inside it", async () => {
    await renderCard();
    const card = finishButton().element().closest("[inert], div")!.parentElement!.parentElement!;
    // An animation ending inside the card before it's leaving, and inside it while it is.
    card.querySelector("ul")!.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
    card.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
    await expect.element(finishButton()).toBeVisible();
    await finishButton().click();
    card.querySelector("ul")!.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
    await expect.element(thanks()).toBeVisible();
  });

  it("shows the thank-you to someone who finished on an earlier visit", async () => {
    localStorage.setItem(KEY, JSON.stringify({ count: 3, done: true }));
    await renderCard();
    await expect.element(thanks()).toBeVisible();
  });

  it("renders the share card on the server, with no share sheet and nothing shared", () => {
    const html = renderToString(<ShareActions />);
    expect(html).toContain(copy.copy);
    expect(html).not.toContain(copy.share + "<");
  });

  it("works without storage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("no storage");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("no storage");
    });
    await renderCard();
    await finishButton().click();
    await expect.element(thanks()).toBeVisible();
  });
});
