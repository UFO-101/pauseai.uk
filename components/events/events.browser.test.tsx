import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { site } from "@/lib/content/site";
import EventList from "./EventList";
import { exampleEvent } from "./EventList.examples";
import EventsSection from "./EventsSection";
import LocalGroupEvents from "./LocalGroupEvents";

const { getEvents } = vi.hoisted(() => ({ getEvents: vi.fn() }));
vi.mock("@/lib/server/luma-calendar", () => ({ getEvents }));

afterEach(async () => {
  // Back to Vitest's default viewport, for tests that widen it to a desktop's.
  await page.viewport(414, 896);
  vi.useRealTimers();
  getEvents.mockReset();
});

const event = exampleEvent;

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
    await expect.element(page.getByRole("link", { name: /Event 1/ })).toHaveAttribute("href", "https://lu.ma/evt-1");
    // Each card is a link: the date, then the title, then the place.
    const cards = [...container.querySelectorAll("a")];
    expect(cards.map((card) => card.querySelector("h3 + p")?.textContent)).toEqual([
      "London",
      "A hall",
      "In person",
      "Online",
    ]);
    expect(cards[0].querySelector("p")?.textContent).toBe("Sat 2 Mar · 13:00");
    expect(container.querySelector("button")).toBeNull();
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
    const images = [...container.querySelectorAll("a")].map((card) => card.firstElementChild?.firstElementChild);
    expect(images.map((image) => image?.tagName)).toEqual(["IMG", "DIV", "DIV"]);
    // The placeholder is a coloured block where the picture would be.
    expect(getComputedStyle(images[1]!).backgroundImage).toContain("gradient");
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
      .poll(() => [...container.querySelectorAll("a span")].map((b) => b.textContent))
      .toEqual(["Happening today", "Happening tomorrow", "Happening today"]);
  });

  // The titles of the events a person can see.
  const shownEvents = (container: HTMLElement) =>
    [...container.querySelectorAll("a")]
      .filter((card) => getComputedStyle(card).display !== "none")
      .map((card) => card.querySelector("h3")?.textContent);

  it("shows four on a desktop, with the rest behind Show more", async () => {
    await page.viewport(1200, 800);
    const { container } = await render(<EventList lumaUrl="x" events={[1, 2, 3, 4, 5, 6].map((n) => event(n))} />);
    await expect.poll(() => shownEvents(container)).toEqual(["Event 1", "Event 2", "Event 3", "Event 4"]);
    await page.getByRole("button", { name: "Show more events" }).click();
    await expect
      .poll(() => shownEvents(container))
      .toEqual(["Event 1", "Event 2", "Event 3", "Event 4", "Event 5", "Event 6"]);
    await page.getByRole("button", { name: "Show fewer events" }).click();
    await expect.poll(() => shownEvents(container)).toEqual(["Event 1", "Event 2", "Event 3", "Event 4"]);
  });

  it("shows every event on a phone, which scrolls through them, without Show more", async () => {
    const { container } = await render(<EventList lumaUrl="x" events={[1, 2, 3, 4, 5, 6].map((n) => event(n))} />);
    expect(shownEvents(container)).toHaveLength(6);
    const button = container.querySelector("button")!;
    expect(button.textContent).toBe("Show more events");
    expect(button.checkVisibility()).toBe(false);
  });

  it("shows everything at once when asked", async () => {
    await page.viewport(1200, 800);
    const { container } = await render(<EventList lumaUrl="x" showAll events={[1, 2, 3, 4, 5].map((n) => event(n))} />);
    expect(container.querySelector("button")).toBeNull();
    expect(shownEvents(container)).toEqual(["Event 1", "Event 2", "Event 3", "Event 4", "Event 5"]);
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

describe("EventsSection", () => {
  it("heads the list, with a link to the calendar when given one", async () => {
    const { rerender } = await render(
      <EventsSection
        id="events"
        heading="Upcoming events"
        calendar={{ label: "See the calendar", href: "https://lu.ma/cal" }}
      >
        <p>The list</p>
      </EventsSection>,
    );
    await expect.element(page.getByRole("heading", { name: "Upcoming events" })).toBeVisible();
    await expect.element(page.getByText("The list")).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: "See the calendar" }))
      .toHaveAttribute("href", "https://lu.ma/cal");
    expect(document.getElementById("events")?.tagName).toBe("SECTION");
    await rerender(
      <EventsSection heading="Upcoming events">
        <p>The list</p>
      </EventsSection>,
    );
    await expect.element(page.getByRole("link")).not.toBeInTheDocument();
  });

  it("puts the list's buttons before the calendar link, which can be a ghost button", async () => {
    const { rerender } = await render(
      <EventsSection
        heading="Upcoming events"
        actions={<button type="button">Filter</button>}
        calendar={{ label: "See the calendar", href: "https://lu.ma/cal", variant: "ghost" }}
      >
        <p>The list</p>
      </EventsSection>,
    );
    const filter = page.getByRole("button", { name: "Filter" }).element();
    const calendar = page.getByRole("link", { name: "See the calendar" }).element();
    expect(filter.compareDocumentPosition(calendar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getComputedStyle(calendar).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    await rerender(
      <EventsSection heading="Upcoming events" actions={<button type="button">Filter</button>}>
        <p>The list</p>
      </EventsSection>,
    );
    await expect.element(page.getByRole("button", { name: "Filter" })).toBeVisible();
    await expect.element(page.getByRole("link")).not.toBeInTheDocument();
  });
});

describe("LocalGroupEvents", () => {
  it("lists the group's upcoming and past events, online ones only when they name the group", async () => {
    getEvents.mockImplementation(async (period: string) =>
      period === "future"
        ? [
            event(1, { name: "London social", geo_address_info: { city: "London" } }),
            event(2, { name: "Online intro" }),
            event(4, { name: "London online call" }),
            event(3, { name: "Glasgow stall", geo_address_info: { city: "Glasgow" } }),
          ]
        : [event(9, { name: "Old London march", geo_address_info: { city: "London" } })],
    );
    await render(await LocalGroupEvents({ localGroupName: "London" }));
    await expect.element(page.getByRole("heading", { name: "Upcoming events in London" })).toBeVisible();
    await expect.element(page.getByText("London social")).toBeVisible();
    await expect.element(page.getByText("London online call")).toBeVisible();
    expect(document.body.textContent).not.toContain("Online intro");
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
    await expect.element(page.getByRole("heading", { name: "Past events in Oxford" })).not.toBeInTheDocument();
  });
});
