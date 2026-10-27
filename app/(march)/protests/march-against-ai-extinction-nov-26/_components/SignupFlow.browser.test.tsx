import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { marchSignupCopy as copy } from "@/lib/content/march-signup";
import MarchSignupFrame from "./MarchSignupFrame";
import SignupFlow from "./SignupFlow";

async function renderFlow() {
  await render(
    <MarchSignupFrame>
      <div style={{ height: 1500 }} />
      <SignupFlow register={async () => ({ ok: true })} />
      <div style={{ height: 1500 }} />
    </MarchSignupFrame>,
  );
}

async function register() {
  await page.getByLabelText("Full name").fill("Testy McTestface");
  await page.getByLabelText("Email address").fill("testy@example.org");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
}

const shareHeading = () => page.getByRole("heading", { name: copy.share.title });
/** Where focus lands on the share card: its confirmation, above the heading. */
const shareFocus = () => shareHeading().element().parentElement!.querySelector("[data-focus-first]");

afterEach(() => {
  vi.restoreAllMocks();
  scrollTo({ top: 0, behavior: "instant" });
});

describe("SignupFlow", () => {
  it("turns the form into the share card, then the form again for someone else", async () => {
    await renderFlow();
    expect(document.activeElement).toBe(document.body);
    await register();
    await expect.element(shareHeading()).toBeVisible();
    await expect.poll(() => document.activeElement).toBe(shareFocus());
    expect(page.getByLabelText("Full name").query()).toBeNull();

    await page.getByRole("button", { name: copy.share.registerAnother }).click();
    const name = page.getByLabelText("Full name");
    await expect.element(name).toHaveValue("");
    await expect.poll(() => document.activeElement).toBe(name.element());
  });

  it("sends the form to the march's endpoint when not given a register", async () => {
    const fetch = vi.spyOn(window, "fetch").mockResolvedValue(Response.json({ ok: true }));
    await render(
      <MarchSignupFrame>
        <SignupFlow />
      </MarchSignupFrame>,
    );
    await register();
    await expect.element(shareHeading()).toBeVisible();
    expect(fetch).toHaveBeenCalledWith("/api/march/register", expect.objectContaining({ method: "POST" }));
  });

  it("keeps the share card within a phone's width, its app row scrolling instead", async () => {
    await page.viewport(390, 844);
    await render(
      <MarchSignupFrame>
        <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>
          <SignupFlow register={async () => ({ ok: true })} />
        </div>
      </MarchSignupFrame>,
    );
    await register();
    await expect.element(shareHeading()).toBeVisible();
    const card = shareHeading().element().parentElement!;
    expect(card.getBoundingClientRect().width).toBeLessThanOrEqual(390);
    await page.viewport(1280, 900);
  });

  it("scrolls a card taller than the window to its top, not its bottom", async () => {
    await page.viewport(360, 500);
    await renderFlow();
    await register();
    await expect.element(shareHeading()).toBeVisible();
    const card = shareHeading().element().parentElement!;
    expect(card.getBoundingClientRect().height).toBeGreaterThan(500);
    // Under the room the page keeps for its header, and the card wrapper's own margin.
    const above = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 16;
    await expect.poll(() => Math.round(card.getBoundingClientRect().top)).toBe(above);
    await page.viewport(1280, 900);
  });

  it("swaps at once with reduced motion", async () => {
    const real = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query) =>
      query === "(prefers-reduced-motion: reduce)"
        ? ({ ...real(query), matches: true } as MediaQueryList)
        : real(query),
    );
    await renderFlow();
    await register();
    await expect.element(shareHeading()).toBeVisible();
    expect(shareHeading().element().closest("[data-motion]")).toBeNull();
    await expect.poll(() => document.activeElement).toBe(shareFocus());
  });
});
