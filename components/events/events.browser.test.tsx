import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { site } from "@/lib/content/site";
import type { LumaEntry } from "@/lib/events";
import EventList from "./EventList";
import LocalGroupEvents from "./LocalGroupEvents";

const { getEvents } = vi.hoisted(() => ({ getEvents: vi.fn() }));
vi.mock("@/lib/server/luma-calendar", () => ({ getEvents }));

afterEach(() => {
  vi.useRealTimers();
  getEvents.mockReset();
});

const event = (n: number, extra: Partial<LumaEntry["event"]> = {}): LumaEntry => ({
  event: {
    url: `evt-${n}`,
    name: `Event ${n}`,
    start_at: "2030-03-02T13:00:00.000Z",
    timezone: "Europe/London",
    ...extra,
  },
});

describe("EventList", () => {
  it("links each event to Luma, with its date, time and place", async () => {
    const { container } = await render(
      <EventList
        lumaUrl={site.social.luma}
        events={[
          event(1, { geo_address_info: { city: "London" } }),
          event(2, { geo_address_info: { address: "A hall" } }),
          event(3, { geo_address_info: {} }),
          event(4),
        ]}
      />,
    );
    const cards = container.querySelectorAll("a.luma-event-card");
    expect(cards[0].getAttribute("href")).toBe("https://lu.ma/evt-1");
    expect([...container.querySelectorAll(".luma-event-card-location")].map((p) => p.textContent)).toEqual([
      "London",
      "A hall",
      "In person",
      "Online",
    ]);
    expect(cards[0].querySelector(".luma-event-card-date")?.textContent).toBe("Sat 2 Mar · 13:00");
    expect(container.querySelector(".luma-events-more")).toBeNull();
  });

  it("shows allowed cover images, and a placeholder for others", async () => {
    const { container } = await render(
      <EventList
        lumaUrl="x"
        events={[
          event(1, { cover_url: "https://images.lumacdn.com/a.jpg" }),
          event(2, { cover_url: "https://evil.example/b.jpg" }),
          event(3),
        ]}
      />,
    );
    expect(container.querySelectorAll("img.luma-event-card-img")).toHaveLength(1);
    expect(container.querySelectorAll(".luma-event-card-img--placeholder")).toHaveLength(2);
  });

  it("marks events happening today and tomorrow, in UK time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-03-02T09:00:00Z"));
    const { container } = await render(
      <EventList
        lumaUrl="x"
        events={[
          event(1),
          event(2, { start_at: "2030-03-03T13:00:00.000Z", timezone: "" }),
          event(3, { start_at: "2030-03-09T13:00:00.000Z" }),
          event(4, { timezone: "Mars/Olympus_Mons" }),
        ]}
      />,
    );
    await expect
      .poll(() => [...container.querySelectorAll(".luma-event-badge")].map((b) => b.textContent))
      .toEqual(["Happening today", "Happening tomorrow", "Happening today"]);
  });

  it("shows four, with the rest behind Show more", async () => {
    const { container } = await render(<EventList lumaUrl="x" events={[1, 2, 3, 4, 5, 6].map((n) => event(n))} />);
    expect(container.querySelectorAll(".luma-event-card--extra")).toHaveLength(2);
    // The button is hidden by CSS at this narrow test width, where phones scroll through every event.
    const button = () => container.querySelector(".luma-events-more button") as HTMLElement;
    expect(button().textContent).toBe("Show more events");
    button().click();
    await expect
      .poll(() => container.querySelector(".luma-events-list")?.className)
      .toBe("luma-events-list is-expanded");
    expect(button().textContent).toBe("Show fewer events");
    button().click();
    await expect.poll(() => container.querySelector(".luma-events-list")?.className).toBe("luma-events-list");
  });

  it("shows everything at once when asked", async () => {
    const { container } = await render(<EventList lumaUrl="x" showAll events={[1, 2, 3, 4, 5].map((n) => event(n))} />);
    expect(container.querySelector(".luma-events-more")).toBeNull();
    expect(container.querySelector(".luma-events-list")?.className).toBe("luma-events-list is-expanded");
  });

  it("points to the calendar when there's nothing to list, or says what it was told to", async () => {
    const { container, rerender } = await render(<EventList lumaUrl="https://lu.ma/cal" events={[]} />);
    await expect
      .element(page.getByRole("link", { name: "event calendar" }))
      .toHaveAttribute("href", "https://lu.ma/cal");
    await rerender(<EventList lumaUrl="x" events={[]} empty="Nothing here." />);
    expect(container.textContent).toBe("Nothing here.");
  });
});

describe("LocalGroupEvents", () => {
  it("lists the group's upcoming, online and past events", async () => {
    getEvents.mockImplementation(async (period: string) =>
      period === "future"
        ? [
            event(1, { name: "London social", geo_address_info: { city: "London" } }),
            event(2, { name: "Online intro" }),
            event(3, { name: "Glasgow stall", geo_address_info: { city: "Glasgow" } }),
          ]
        : [event(9, { name: "Old London march", geo_address_info: { city: "London" } })],
    );
    await render(await LocalGroupEvents({ localGroupName: "London" }));
    await expect.element(page.getByRole("heading", { name: "Upcoming events in London" })).toBeVisible();
    await expect.element(page.getByText("London social")).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Online events" })).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Past events in London" })).toBeVisible();
    expect(document.body.textContent).not.toContain("Glasgow stall");
    await expect
      .element(page.getByRole("link", { name: "View the full UK calendar →" }))
      .toHaveAttribute("href", site.social.luma);
  });

  it("says when the group has nothing on, and leaves out empty sections", async () => {
    getEvents.mockResolvedValue([]);
    await render(await LocalGroupEvents({ localGroupName: "Oxford" }));
    await expect.element(page.getByText(/Nothing is listed in Oxford just now/)).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Online events" })).not.toBeInTheDocument();
    await expect.element(page.getByRole("heading", { name: "Past events in Oxford" })).not.toBeInTheDocument();
  });
});
