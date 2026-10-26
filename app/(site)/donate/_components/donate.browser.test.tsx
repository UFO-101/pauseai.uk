import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import DonateBottom from "./DonateBottom";
import DonateForm, { DEFAULT_AMOUNT, MONTHLY_URLS, ONE_OFF_URL } from "./DonateForm";
import DonateIntro from "./DonateIntro";
import DonateThanks from "./DonateThanks";
import { exampleDonors } from "./DonateThanks.examples";

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
    await page.getByRole("button", { name: "Donate £25 a month" }).click();
    expect(navigate).toHaveBeenCalledWith(MONTHLY_URLS[25]);
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
  it("names the latest five donors, each with the month they gave, and counts them all", async () => {
    await render(<DonateThanks donors={exampleDonors} />);
    const donors = page.getByRole("listitem");
    await expect.element(donors.nth(0)).toHaveTextContent("Ada PembertonOctober 2026");
    await expect.element(donors.nth(4)).toHaveTextContent("Chen WeiAugust 2026");
    expect(donors.all()).toHaveLength(5);
    await expect.element(page.getByText("Morag Fraser")).not.toBeInTheDocument();
    await expect.element(page.getByText(/\b6\b/)).toBeVisible();
  });

  it("dates a gift late on the last day of a month by the month it was in the UK", async () => {
    await render(<DonateThanks donors={[{ name: "Late Night", givenAt: "2026-07-31T23:30:00.000Z" }]} />);
    await expect.element(page.getByRole("listitem")).toHaveTextContent("Late NightAugust 2026");
  });

  it("shows nothing before anyone has said yes", async () => {
    const { container } = await render(<DonateThanks donors={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
