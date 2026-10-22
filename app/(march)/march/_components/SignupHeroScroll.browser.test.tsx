import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import MarchSignupFrame from "./MarchSignupFrame";
import SignupHero from "./SignupHero";
import SignupHeroScroll from "./SignupHeroScroll";

/** The hero, then enough page under it to scroll. */
async function renderHero() {
  await render(
    <MarchSignupFrame>
      <SignupHero />
      <div style={{ height: 3000 }}>The next band</div>
    </MarchSignupFrame>,
  );
  await expect.element(page.getByRole("heading", { level: 1 })).toBeVisible();
}

const heroEnd = () => {
  const hero = page.getByRole("heading", { level: 1 }).element().closest("section")!;
  return hero.offsetTop + hero.offsetHeight;
};

/** Whether the page let the event through: false when the hero took it. */
const wheel = (deltaY: number, init: WheelEventInit = {}) =>
  window.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true, ...init }));
const key = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true, ...init }));

const settled = () => new Promise((done) => setTimeout(done, 1200));

beforeEach(async () => {
  await page.viewport(1280, 1000);
  scrollTo({ top: 0, behavior: "instant" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SignupHeroScroll", () => {
  it("glides past the hero on the first scroll down, and back up to the top", async () => {
    await renderHero();
    expect(wheel(100)).toBe(false);
    // Through the glide, and for as long as the wheel keeps going after it
    // (trackpad momentum), the wheel is swallowed.
    for (let i = 0; i < 13; i++) {
      expect(wheel(100)).toBe(false);
      await new Promise((done) => setTimeout(done, 100));
    }
    expect(scrollY).toBe(heroEnd());
    await new Promise((done) => setTimeout(done, 250));
    // Past the hero, scrolling down is the browser's.
    expect(wheel(100)).toBe(true);
    expect(wheel(-100)).toBe(false);
    await expect.poll(() => scrollY, { timeout: 3000 }).toBe(0);
  });

  it("leaves pinch zoom, sideways scrolling and scrolling up from the top alone", async () => {
    await renderHero();
    expect(wheel(100, { ctrlKey: true })).toBe(true);
    expect(wheel(10, { deltaX: 100 })).toBe(true);
    expect(wheel(-100)).toBe(true);
  });

  it("glides on the keys that scroll", async () => {
    await renderHero();
    expect(key("PageDown")).toBe(false);
    // Mid-glide, keys are swallowed.
    expect(key("ArrowDown")).toBe(false);
    await expect.poll(() => scrollY, { timeout: 3000 }).toBe(heroEnd());
    await settled();
    expect(key(" ", { shiftKey: true })).toBe(false);
    await expect.poll(() => scrollY, { timeout: 3000 }).toBe(0);
    await settled();
    expect(key(" ")).toBe(false);
    await settled();
    expect(key("ArrowUp")).toBe(false);
    await settled();
    expect(key("PageUp")).toBe(true);
    expect(key("ArrowDown")).toBe(false);
    await settled();
    expect(key("ArrowDown")).toBe(true);
  });

  it("leaves other keys, keys with modifiers, and typing in a field alone", async () => {
    await renderHero();
    const input = document.createElement("input");
    document.body.append(input);
    expect(key("ArrowDown", {}, input)).toBe(true);
    input.remove();
    expect(key("a")).toBe(true);
    for (const modifier of ["altKey", "ctrlKey", "metaKey"]) expect(key("ArrowDown", { [modifier]: true })).toBe(true);
    const handled = new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true, bubbles: true });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    expect(scrollY).toBe(0);
  });

  it("leaves a hero taller than the window to scroll normally", async () => {
    await page.viewport(1000, 300);
    await renderHero();
    expect(wheel(100)).toBe(true);
    expect(key("PageDown")).toBe(true);
  });

  it("glides there from the scroll cue", async () => {
    await renderHero();
    await page.getByRole("button", { name: "Scroll down" }).click();
    await expect.poll(() => scrollY, { timeout: 3000 }).toBe(heroEnd());
  });

  it("jumps with reduced motion, and doesn't glide", async () => {
    const real = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query) =>
      query === "(prefers-reduced-motion: reduce)"
        ? ({ ...real(query), matches: true } as MediaQueryList)
        : real(query),
    );
    await renderHero();
    expect(wheel(100)).toBe(true);
    await page.getByRole("button", { name: "Scroll down" }).click();
    await expect.poll(() => scrollY).toBe(heroEnd());
  });

  it("scrolls to the top when it isn't in a hero", async () => {
    await render(
      <>
        <SignupHeroScroll />
        <div style={{ height: 3000 }} />
      </>,
    );
    scrollTo({ top: 500, behavior: "instant" });
    await page.getByRole("button", { name: "Scroll down" }).click();
    await expect.poll(() => scrollY).toBe(0);
  });
});
