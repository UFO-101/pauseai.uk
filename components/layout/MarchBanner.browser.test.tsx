import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import MarchBanner from "./MarchBanner";

afterEach(() => {
  vi.useRealTimers();
});

describe("MarchBanner", () => {
  it("links its name and Register to the march's sign-up", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-15T09:00:00Z"), toFake: ["Date"] });
    await render(<MarchBanner />);
    await expect.element(page.getByText("Sat 21 Nov · London")).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: /March Against AI Extinction/ }))
      .toHaveAttribute("href", "/protests/march-against-ai-extinction-nov-26");
    await expect
      .element(page.getByRole("link", { name: "Register →" }))
      .toHaveAttribute("href", "/protests/march-against-ai-extinction-nov-26");
  });

  it("goes after the march", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-22T20:00:00Z"), toFake: ["Date"] });
    const { container, rerender } = await render(<MarchBanner />);
    expect(container.querySelector("aside")).not.toBeNull();
    vi.setSystemTime(new Date("2026-11-23T00:00:00Z"));
    await rerender(<MarchBanner />);
    expect(container.querySelector("aside")).toBeNull();
  });

  it("is always in the server's HTML, so hydration matches whatever the date", () => {
    vi.useFakeTimers({ now: new Date("2027-01-01T00:00:00Z"), toFake: ["Date"] });
    expect(renderToString(<MarchBanner />)).toContain("Register");
  });
});
