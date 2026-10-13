import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import FlyeringTracker, { ukTime, type FlyeringRace } from "./FlyeringTracker";

const race: FlyeringRace = {
  date: "26 September",
  day: "Saturday 26 September",
  eventApiId: "evt-x",
  eventUrl: "https://luma.com/x",
  open: new Date("2026-09-26T12:00:00+01:00"),
  close: new Date("2026-09-26T16:00:00+01:00"),
  unit: "stall",
  closedMessage: "Stalls have closed.",
  untagged: "a stall tag",
  stalls: [
    { tag: "a", name: "Angel" },
    { tag: "b", name: "Brixton" },
    { tag: "c", name: "Camden" },
    { tag: "d", name: "Dalston" },
  ],
};

const counts = (a: number, b: number, c: number, d: number, other = 0) => ({ counts: { a, b, c, d }, other, total: a + b + c + d + other });
const before = new Date("2026-09-26T10:00:00+01:00");
const during = new Date("2026-09-26T13:00:00+01:00");
const justClosed = new Date("2026-09-26T16:02:00+01:00");
const final = new Date("2026-09-26T16:10:00+01:00");

describe("FlyeringTracker", () => {
  it("formats times in UK time", () => {
    expect(ukTime(new Date("2026-09-26T11:00:00Z"))).toBe("12:00");
  });

  it("counts down before the race", async () => {
    const { container } = await render(<FlyeringTracker race={race} result={counts(0, 0, 0, 0)} afterResult={null} now={before} />);
    await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("Flyering signups, 26 September");
    expect(container.querySelector(".tracker-banner")?.textContent).toBe("Get ready to flyer! The race starts at 12:00 on Saturday 26 September (BST).");
    expect(container.querySelector(".tracker-lede")?.textContent).toContain("each stall’s QR code");
  });

  it("ranks stalls during the race, busiest first, with medals but no winner yet", async () => {
    const { container } = await render(<FlyeringTracker race={race} result={counts(3, 7, 3, 0, 2)} afterResult={counts(9, 9, 9, 9)} now={during} />);
    const names = [...container.querySelectorAll(".tracker-name")].map((n) => n.textContent);
    expect(names).toEqual(["Brixton 🥇", "Angel 🥈", "Camden 🥈", "Dalston"]);
    expect(container.querySelector(".tracker-banner")).toBeNull();
    expect(container.querySelector(".tracker-total")?.textContent).toBe("13 during the flyering");
    // Afterwards counts aren't shown until the race has closed.
    expect(container.querySelector(".tracker-split")).toBeNull();
    expect(container.querySelector(".tracker-note")?.textContent).toBe("During the flyering: of 15 registrations between 12:00 and 16:00, 2 came from elsewhere, or from links without a stall tag.");
  });

  it("waits a few minutes after closing before naming a winner", async () => {
    const { container } = await render(<FlyeringTracker race={race} result={counts(3, 7, 3, 0)} afterResult={counts(1, 0, 0, 0)} now={justClosed} />);
    expect(container.querySelector(".tracker-note")?.textContent).toBe("Stalls have closed. Counting the last registrations…");
    expect(container.querySelector(".tracker-total")?.textContent).toBe("13 during the flyering + 1 since");
    expect(container.querySelector(".tracker-legend")?.textContent).toContain("During flyering (12:00–16:00)");
    expect(container.querySelector(".tracker-split")?.textContent).toBe("7 + 0");
  });

  it("names the winner and the wooden spoon in the final result", async () => {
    const { container } = await render(<FlyeringTracker race={race} result={counts(3, 7, 3, 1)} afterResult={counts(0, 0, 0, 0, 4)} now={final} />);
    expect(container.querySelector(".tracker-banner")?.textContent).toBe("🏆 Winner: Brixton with 7!");
    expect(container.querySelector('[aria-label="wooden spoon"]')?.closest(".tracker-name")?.textContent).toContain("Dalston");
    expect(container.querySelector(".tracker-note:last-of-type")?.textContent).toContain("Afterwards, the lasting effect of the day: of 4 since 16:00, 4 came from elsewhere");
  });

  it("calls a tie", async () => {
    const { container } = await render(<FlyeringTracker race={race} result={counts(5, 5, 1, 0)} afterResult={counts(0, 0, 0, 0)} now={final} />);
    expect(container.querySelector(".tracker-banner")?.textContent).toBe("🏆 It's a tie between Angel and Brixton with 5!");
  });

  it("says so when nobody signed up through a QR code", async () => {
    const { container } = await render(<FlyeringTracker race={race} result={counts(0, 0, 0, 0, 3)} afterResult={null} now={final} />);
    expect(container.querySelector(".tracker-note")?.textContent).toBe("Stalls have closed. No one signed up through a stall QR code.");
    expect(container.querySelector(".tracker-legend")).toBeNull();
    expect(container.querySelector(".tracker-total")?.textContent).toBe("0 during the flyering");
    // With every bar at zero, none has width.
    expect([...container.querySelectorAll<HTMLElement>(".tracker-bar")].every((b) => b.style.width === "0%")).toBe(true);
  });

  it("says when Luma can't be read", async () => {
    await render(<FlyeringTracker race={race} result={null} afterResult={null} now={during} />);
    expect(page.getByRole("alert").element().textContent).toMatch(/^Couldn’t load registrations from Luma/);
  });
});
