import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import FlyeringTracker, { ukTime } from "./FlyeringTracker";
import { exampleCounts, exampleRace, exampleTimes } from "./FlyeringTracker.examples";

const race = exampleRace;
const counts = exampleCounts;
const { before, during, justClosed, final } = exampleTimes;

describe("FlyeringTracker", () => {
  it("formats times in UK time", () => {
    expect(ukTime(new Date("2026-09-26T11:00:00Z"))).toBe("12:00");
  });

  it("counts down before the race", async () => {
    await render(<FlyeringTracker race={race} result={counts(0, 0, 0, 0)} afterResult={null} now={before} />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Flyering signups, 26 September");
    expect(page.getByText(/^Get ready to flyer!/).element().textContent).toBe(
      "Get ready to flyer! The race starts at 12:00 on Saturday 26 September (BST).",
    );
    expect(page.getByText(/^Registrations to the event/).element().textContent).toContain("each stall’s QR code");
  });

  it("ranks stalls during the race, busiest first, with medals but no winner yet", async () => {
    await render(
      <FlyeringTracker race={race} result={counts(3, 7, 3, 0, 2)} afterResult={counts(9, 9, 9, 9)} now={during} />,
    );
    // Each row starts with the stall's name and any medal.
    const names = page
      .getByRole("listitem")
      .elements()
      .map((row) => row.querySelector("span")?.textContent);
    expect(names).toEqual(["Brixton 🥇", "Angel 🥈", "Camden 🥈", "Dalston"]);
    expect(page.getByText(/^(Get ready to flyer!|🏆)/).query()).toBeNull();
    expect(page.getByText(/^\d+ during the flyering/).element().textContent).toBe("13 during the flyering");
    // Afterwards counts aren't shown until the race has closed.
    expect(page.getByText(/^\d+ \+ \d+$/).query()).toBeNull();
    expect(page.getByText(/^During the flyering: of/).element().textContent).toBe(
      "During the flyering: of 15 registrations between 12:00 and 16:00, 2 came from elsewhere, or from links without a stall tag.",
    );
  });

  it("waits a few minutes after closing before naming a winner", async () => {
    await render(
      <FlyeringTracker race={race} result={counts(3, 7, 3, 0)} afterResult={counts(1, 0, 0, 0)} now={justClosed} />,
    );
    expect(page.getByText(/^Stalls have closed\./).element().textContent).toBe(
      "Stalls have closed. Counting the last registrations…",
    );
    expect(page.getByText(/^\d+ during the flyering/).element().textContent).toBe("13 during the flyering + 1 since");
    expect(page.getByText(/During flyering \(/).element().textContent).toContain("During flyering (12:00–16:00)");
    expect(
      page
        .getByText(/^\d+ \+ \d+$/)
        .first()
        .element().textContent,
    ).toBe("7 + 0");
  });

  it("names the winner and the wooden spoon in the final result", async () => {
    await render(
      <FlyeringTracker race={race} result={counts(3, 7, 3, 1)} afterResult={counts(0, 0, 0, 0, 4)} now={final} />,
    );
    expect(page.getByText(/^🏆/).element().textContent).toBe("🏆 Winner: Brixton with 7!");
    // The spoon sits in its stall's name.
    expect(page.getByRole("img", { name: "wooden spoon" }).element().parentElement?.textContent).toContain("Dalston");
    expect(page.getByText(/^During the flyering: of/).element().textContent).toContain(
      "Afterwards, the lasting effect of the day: of 4 since 16:00, 4 came from elsewhere",
    );
  });

  it("calls a tie", async () => {
    await render(
      <FlyeringTracker race={race} result={counts(5, 5, 1, 0)} afterResult={counts(0, 0, 0, 0)} now={final} />,
    );
    expect(page.getByText(/^🏆/).element().textContent).toBe("🏆 It's a tie between Angel and Brixton with 5!");
  });

  it("says so when nobody signed up through a QR code", async () => {
    await render(<FlyeringTracker race={race} result={counts(0, 0, 0, 0, 3)} afterResult={null} now={final} />);
    expect(page.getByText(/^Stalls have closed\./).element().textContent).toBe(
      "Stalls have closed. No one signed up through a stall QR code.",
    );
    expect(page.getByText(/During flyering \(/).query()).toBeNull();
    expect(page.getByText(/^\d+ during the flyering/).element().textContent).toBe("0 during the flyering");
    // With every bar at zero, none has width. Each row has two bars: the race count and, behind it, the total.
    const bars = page
      .getByRole("listitem")
      .elements()
      .flatMap((row) => [...row.querySelectorAll<HTMLElement>(":scope > span[aria-hidden='true']")]);
    expect(bars).toHaveLength(8);
    expect(bars.every((b) => b.style.width === "0%")).toBe(true);
  });

  it("says when Luma can't be read", async () => {
    await render(<FlyeringTracker race={race} result={null} afterResult={null} now={during} />);
    expect(page.getByRole("alert").element().textContent).toMatch(/^Couldn’t load registrations from Luma/);
  });
});
