import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { navigation } from "@/tests/browser/navigation";
import MarchBanner from "./MarchBanner";

afterEach(() => {
  vi.useRealTimers();
  navigation.pathname = "/";
});

describe("MarchBanner", () => {
  it("links to the march's page and to registering on Luma", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-15T09:00:00Z"), toFake: ["Date"] });
    const { container } = await render(<MarchBanner />);
    expect(container.querySelector(".march-banner-when")?.textContent).toBe("Sat 21 Nov · London");
    await expect
      .element(page.getByRole("link", { name: /March Against AI Extinction/ }))
      .toHaveAttribute("href", "/protests/march-against-ai-extinction-nov-26");
    await expect
      .element(page.getByRole("link", { name: "Register →" }))
      .toHaveAttribute("href", "https://luma.com/pauseai-nov26");
  });

  it("isn't on the march's own page", async () => {
    navigation.pathname = "/protests/march-against-ai-extinction-nov-26/";
    const { container } = await render(<MarchBanner />);
    expect(container.querySelector(".march-banner")).toBeNull();
  });

  it("goes after the march", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-22T20:00:00Z"), toFake: ["Date"] });
    const { container, rerender } = await render(<MarchBanner />);
    expect(container.querySelector(".march-banner")).not.toBeNull();
    vi.setSystemTime(new Date("2026-11-23T00:00:00Z"));
    await rerender(<MarchBanner />);
    expect(container.querySelector(".march-banner")).toBeNull();
  });

  it("is always in the server's HTML, so hydration matches whatever the date", () => {
    vi.useFakeTimers({ now: new Date("2027-01-01T00:00:00Z"), toFake: ["Date"] });
    expect(renderToString(<MarchBanner />)).toContain("march-banner");
  });
});
