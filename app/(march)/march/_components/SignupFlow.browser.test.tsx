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
  await page.getByLabelText("First name").fill("Testy");
  await page.getByLabelText("Last name").fill("McTestface");
  await page.getByLabelText("Email address").fill("testy@example.org");
  await page.getByRole("button", { name: copy.form.submit, exact: true }).click();
}

const shareHeading = () => page.getByRole("heading", { name: copy.share.title });
const thanksHeading = () => page.getByRole("heading", { name: "Thank you for registering" });

afterEach(() => {
  vi.restoreAllMocks();
  scrollTo({ top: 0, behavior: "instant" });
});

describe("SignupFlow", () => {
  it("turns the form into the share card, then the thank-you, then the form again", async () => {
    await renderFlow();
    expect(document.activeElement).toBe(document.body);
    await register();
    await expect.element(shareHeading()).toBeVisible();
    await expect.poll(() => document.activeElement).toBe(shareHeading().element());
    expect(page.getByLabelText("First name").query()).toBeNull();

    await page.getByRole("button", { name: copy.share.finish }).click();
    await expect.element(thanksHeading()).toBeVisible();
    await expect.poll(() => document.activeElement).toBe(thanksHeading().element());

    await page.getByRole("button", { name: copy.thanks.registerAnother }).click();
    const firstName = page.getByLabelText("First name");
    await expect.element(firstName).toHaveValue("");
    await expect.poll(() => document.activeElement).toBe(firstName.element());
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
    await expect.poll(() => document.activeElement).toBe(shareHeading().element());
  });
});
