import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import DonateBottom from "./DonateBottom";
import DonateForm, { DEFAULT_AMOUNT, MONTHLY_URLS, ONE_OFF_URL } from "./DonateForm";
import DonateIntro from "./DonateIntro";
import DonateThanks from "./DonateThanks";
import { exampleDonors } from "./DonateThanks.examples";
import type { ThankedDonor } from "@/lib/server/outside-services/stripe";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@/lib/navigate", () => ({ navigate }));

afterEach(() => navigate.mockReset());

describe("DonateForm", () => {
  it("starts on a monthly gift of the default amount, which is one of the tiers", async () => {
    expect(Object.keys(MONTHLY_URLS).map(Number)).toContain(DEFAULT_AMOUNT);
    await render(<DonateForm />);
    await expect.element(page.getByRole("radio", { name: /Monthly/ })).toHaveAttribute("aria-checked", "true");
    await expect
      .element(page.getByRole("button", { name: `£${DEFAULT_AMOUNT}`, exact: true }))
      .toHaveAttribute("aria-pressed", "true");
    await expect.element(page.getByRole("button", { name: `Donate £${DEFAULT_AMOUNT} a month` })).toBeVisible();
  });

  it("sends a monthly donor to the Stripe link for their amount", async () => {
    await render(<DonateForm />);
    await page.getByRole("button", { name: "£25", exact: true }).click();
    const donate = page.getByRole("button", { name: "Donate £25 a month" });
    await donate.click();
    expect(navigate).toHaveBeenCalledWith(MONTHLY_URLS[25]);
    // Pending till Stripe's page comes, so it isn't pressed twice.
    await expect.element(donate).toBeDisabled();
    await expect.element(donate).toHaveAttribute("aria-busy", "true");
  });

  it("switches to a one-off gift, and back to the default monthly amount", async () => {
    await render(<DonateForm />);
    await page.getByRole("button", { name: "£100", exact: true }).click();
    await page.getByRole("radio", { name: /One-off/ }).click();
    await expect.element(page.getByRole("group", { name: "Choose an amount" })).not.toBeInTheDocument();
    // Choosing the current option again changes nothing.
    await page.getByRole("radio", { name: /One-off/ }).click();
    await page.getByRole("button", { name: "Donate one-off →" }).click();
    expect(navigate).toHaveBeenCalledWith(ONE_OFF_URL);
    await page.getByRole("radio", { name: /Monthly/ }).click();
    await expect.element(page.getByRole("button", { name: `Donate £${DEFAULT_AMOUNT} a month` })).toBeVisible();
  });

  it("never links straight to Stripe, so analytics can't see who donates", async () => {
    const { container } = await render(<DonateForm />);
    expect(container.querySelector('a[href*="stripe.com"]:not([href*="privacy"])')).toBeNull();
  });
});

describe("donate page sections", () => {
  it("has the form, other ways to give, and answers", async () => {
    vi.spyOn(HTMLIFrameElement.prototype, "src", "set").mockImplementation(() => {});
    await render(
      <>
        <DonateIntro donors={exampleDonors} />
        <DonateBottom />
      </>,
    );
    await expect.element(page.getByRole("heading", { name: "Any questions?" })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: "Read our donation policies →" }))
      .toHaveAttribute("href", "/governance#donation-policies");
    await expect.element(page.getByRole("button", { name: /Donate £/ })).toBeVisible();
    await expect.element(page.getByText("Ada Pemberton")).toBeVisible();
  });
});

describe("DonateThanks", () => {
  let now = 0;
  beforeEach(() => {
    now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
  });
  afterEach(() => vi.restoreAllMocks());

  /** The window the list rolls in. */
  const window = () => page.getByRole("list").element().parentElement!;

  /**
   * Renders the box with the mouse in the window's far corner. Earlier tests
   * leave it where they last clicked, which can be over the box, and a
   * pointer over it holds the roll.
   */
  async function show(donors: ThankedDonor[]) {
    const away = document.body.appendChild(document.createElement("div"));
    away.style.cssText = "position: fixed; right: 0; bottom: 0; width: 8px; height: 8px";
    await page.elementLocator(away).hover();
    away.remove();
    return render(<DonateThanks donors={donors} />);
  }

  /** Moves the clock on, and waits for the roll's next two frames. */
  async function after(ms: number) {
    now += ms;
    for (let i = 0; i < 2; i++) await new Promise((done) => requestAnimationFrame(done));
  }

  it("lists every donor, newest first, each with the day they gave", async () => {
    await render(<DonateThanks donors={exampleDonors} />);
    const donors = page.getByRole("listitem");
    expect(donors.all()).toHaveLength(6);
    await expect.element(donors.nth(0)).toHaveTextContent("Ada Pemberton16 October 2026");
    await expect.element(donors.nth(5)).toHaveTextContent("Morag Fraser26 July 2026");
  });

  it("rolls slowly upwards by the clock, and stops at the oldest", async () => {
    await show(exampleDonors);
    const el = window();
    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight);
    await after(0);
    expect(el.scrollTop).toBe(0);
    await after(1000);
    expect(el.scrollTop).toBeCloseTo(14, -1);
    await after(60_000);
    expect(el.scrollTop).toBeCloseTo(el.scrollHeight - el.clientHeight, 0);
  });

  it("holds the roll while a pointer is over it, or it has focus", async () => {
    await show(exampleDonors);
    const el = window();
    for (const [hold, release] of [
      ["pointerenter", "pointerleave"],
      ["focusin", "focusout"],
    ]) {
      el.dispatchEvent(new Event(hold));
      const top = el.scrollTop;
      await after(1000);
      expect(el.scrollTop).toBe(top);
      el.dispatchEvent(new Event(release));
      await after(1000);
      expect(el.scrollTop).toBeGreaterThan(top);
    }
  });

  it("stops rolling for good once the reader scrolls it", async () => {
    await show(exampleDonors);
    const el = window();
    const scrolled = new Promise((done) => el.addEventListener("scroll", done, { once: true }));
    el.scrollTop = 30;
    await scrolled;
    await after(1000);
    expect(el.scrollTop).toBe(30);
  });

  it("drags with a mouse, and not with a finger, which scrolls it natively", async () => {
    await show(exampleDonors);
    const el = window();
    vi.spyOn(el, "setPointerCapture").mockImplementation(() => {});
    const pointer = (type: string, clientY: number, pointerType = "mouse") =>
      el.dispatchEvent(new PointerEvent(type, { clientY, pointerType, pointerId: 1 }));
    expect(getComputedStyle(el).cursor).toBe("grab");

    pointer("pointerdown", 100, "touch");
    pointer("pointermove", 60);
    expect(el.scrollTop).toBe(0);

    pointer("pointerdown", 100);
    await expect.poll(() => getComputedStyle(el).cursor).toBe("grabbing");
    pointer("pointermove", 60);
    expect(el.scrollTop).toBe(40);
    pointer("pointerup", 60);
    await expect.poll(() => getComputedStyle(el).cursor).toBe("grab");
    pointer("pointermove", 0);
    expect(el.scrollTop).toBe(40);
    await after(1000);
    expect(el.scrollTop).toBe(40);
  });

  it("doesn't roll for a reader who asks for less motion", async () => {
    vi.spyOn(globalThis, "matchMedia").mockImplementation((q) => ({ matches: true, media: q }) as MediaQueryList);
    await show(exampleDonors);
    await after(1000);
    expect(window().scrollTop).toBe(0);
  });

  it("doesn't roll while everyone fits", async () => {
    await render(<DonateThanks donors={exampleDonors.slice(0, 5)} />);
    const el = window();
    expect(getComputedStyle(el).cursor).toBe("auto");
    expect(el.scrollHeight).toBe(el.clientHeight);
  });

  it("dates a gift late in the evening by the day it was in the UK", async () => {
    await render(<DonateThanks donors={[{ name: "Late Night", givenAt: "2026-07-31T23:30:00.000Z" }]} />);
    await expect.element(page.getByRole("listitem")).toHaveTextContent("Late Night1 August 2026");
  });

  it("shows nothing before anyone has said yes", async () => {
    const { container } = await render(<DonateThanks donors={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
