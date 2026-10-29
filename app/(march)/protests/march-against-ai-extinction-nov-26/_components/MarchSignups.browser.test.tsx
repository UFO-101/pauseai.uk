import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import MarchSignups, { useSignups } from "./MarchSignups";
import { SIGNUPS_REFRESH_MS } from "./signups";

/** Says the count it's given, as each piece of the page that shows it. */
function Shows({ name }: { name: string }) {
  return <p>{`${name}: ${useSignups() ?? "none"}`}</p>;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("MarchSignups", () => {
  it("gives everything in it the same count, kept up to date", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const load = vi.fn(async () => 1240);
    await render(
      <MarchSignups signups={1234} load={load}>
        <Shows name="hero" />
        <Shows name="form" />
      </MarchSignups>,
    );
    await expect.element(page.getByText("hero: 1234")).toBeVisible();
    await expect.element(page.getByText("form: 1234")).toBeVisible();

    await vi.advanceTimersByTimeAsync(SIGNUPS_REFRESH_MS);
    await expect.element(page.getByText("hero: 1240")).toBeVisible();
    await expect.element(page.getByText("form: 1240")).toBeVisible();
    // One ask for the whole page, not one for each piece.
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("gives none outside one", async () => {
    await render(<Shows name="hero" />);
    await expect.element(page.getByText("hero: none")).toBeVisible();
  });
});
