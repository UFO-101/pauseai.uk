import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { navigation } from "@/tests/browser/navigation";
import MarchSignupFrame from "./MarchSignupFrame";
import SignupHeader from "./SignupHeader";
import SignupHero from "./SignupHero";

const header = () => page.getByRole("banner").element();

afterEach(() => {
  scrollTo({ top: 0, behavior: "instant" });
});

describe("SignupHeader", () => {
  it("stays out of sight over the sign-up page's hero, and drops in past it", async () => {
    await page.viewport(1280, 1000);
    navigation.pathname = "/march/";
    await render(
      <MarchSignupFrame>
        <SignupHeader />
        <SignupHero />
        <div style={{ height: 3000 }} />
      </MarchSignupFrame>,
    );
    expect(header().hasAttribute("data-over-hero")).toBe(true);
    expect(header().hasAttribute("data-visible")).toBe(false);
    expect(getComputedStyle(header()).position).toBe("fixed");

    scrollTo({ top: 1500, behavior: "instant" });
    await expect.poll(() => header().hasAttribute("data-visible")).toBe(true);
    scrollTo({ top: 0, behavior: "instant" });
    await expect.poll(() => header().hasAttribute("data-visible")).toBe(false);
  });

  it("is an ordinary sticky header on the share step, with the logo, the march's name and the button", async () => {
    navigation.pathname = "/march/share";
    await render(
      <MarchSignupFrame>
        <SignupHeader />
      </MarchSignupFrame>,
    );
    expect(header().hasAttribute("data-over-hero")).toBe(false);
    expect(getComputedStyle(header()).position).toBe("sticky");
    await expect.element(page.getByRole("link", { name: "PauseAI UK" })).toHaveAttribute("href", "/");
    await expect
      .element(page.getByRole("link", { name: "March Against AI Extinction" }))
      .toHaveAttribute("href", "/march");
    await expect.element(page.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/march#register");
  });

  it("tells the page its height, for anchors to clear it", async () => {
    document.documentElement.style.removeProperty("--site-header-h");
    const { unmount } = await render(<SignupHeader />);
    expect(document.documentElement.style.getPropertyValue("--site-header-h")).toBe(`${header().offsetHeight}px`);
    await unmount();
  });
});
