import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { HERO_PHOTOS } from "@/lib/content/hero-photos";
import { localGroups } from "@/lib/content/local-groups";
import { people } from "@/lib/content/people";
import { newsRow1, type CoverageItem } from "@/lib/content/press-coverage";
import { site } from "@/lib/content/site";
import { staff } from "@/lib/content/staff";
import GetInvolved from "./GetInvolved";
import HomeHero from "./HomeHero";
import JoinSection from "./JoinSection";
import LocalGroupsSection from "./LocalGroupsSection";
import PeopleSection from "./PeopleSection";
import PressMarquee, { NewsRow } from "./PressMarquee";
import ShopBanner from "./ShopBanner";
import StaffSection from "./StaffSection";
import UpcomingEvents from "./UpcomingEvents";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HomeHero", () => {
  it("shows every photo once in three scrolling rows, each row twice", async () => {
    const { container } = await render(<HomeHero />);
    expect(container.querySelector("h1")?.textContent).toBe("Organising forour future");
    const rows = container.querySelectorAll(".hero-marquee-row");
    expect([...rows].map((r) => r.className)).toEqual([
      "hero-marquee-row hero-marquee-row--ltr",
      "hero-marquee-row hero-marquee-row--rtl",
      "hero-marquee-row hero-marquee-row--ltr",
    ]);
    // Each photo's alt text appears once; the repeats are hidden from screen readers.
    const described = [...container.querySelectorAll("img")].map((img) => img.getAttribute("alt")).filter(Boolean);
    expect(described.sort()).toEqual(HERO_PHOTOS.map(([, alt]) => alt).sort());
    expect(container.querySelectorAll('img[aria-hidden="true"]').length).toBe(HERO_PHOTOS.length * 3);
    // Only the very first photo loads eagerly.
    expect(container.querySelectorAll('img:not([loading="lazy"])')).toHaveLength(1);
    await expect.element(page.getByRole("link", { name: "Track record →" })).toHaveAttribute("href", "/track-record");
  });
});

describe("home page sections", () => {
  it("lists the upcoming events with a link to the calendar", async () => {
    await render(
      <UpcomingEvents events={[{ event: { url: "evt", name: "A meetup", start_at: "2030-01-01T18:00:00Z" } }]} />,
    );
    await expect.element(page.getByRole("heading", { name: "Upcoming events" })).toBeVisible();
    await expect.element(page.getByText("A meetup")).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: "View full calendar →" }))
      .toHaveAttribute("href", site.social.luma);
  });

  it("scrolls the press logos, with the second copy hidden from screen readers", async () => {
    const { container } = await render(<PressMarquee />);
    expect(container.querySelectorAll(".news-marquee-row")).toHaveLength(5);
    expect(container.querySelectorAll(".news-marquee-row--reverse")).toHaveLength(2);
    // At this narrow test width the desktop rows are hidden by CSS, so look in the DOM.
    const first = newsRow1[0];
    const link = [...container.querySelectorAll("a.news-marquee-item")].find(
      (a) => a.getAttribute("aria-label") === `${first.outlet}: ${first.title}`,
    );
    expect(link?.getAttribute("href")).toBe(first.url);
    await expect.element(page.getByRole("link", { name: "See our press page →" })).toHaveAttribute("href", "/press");
  });

  it("draws an outlet's logo from its image or its HTML, with default sizes", async () => {
    const items: CoverageItem[] = [
      { outlet: "Image", title: "A", medium: "Article", url: "https://a.example", logoSrc: "/images/x.svg" },
      {
        outlet: "Sized",
        title: "B",
        medium: "Article",
        url: "https://b.example",
        logoSrc: "/images/y.svg",
        logoIntrinsicWidth: 200,
        logoIntrinsicHeight: 50,
        logoHeight: 30,
      },
      { outlet: "Html", title: "C", medium: "Article", url: "https://c.example", logoHtml: "<b>Html</b>" },
    ];
    const { container } = await render(<NewsRow items={items} />);
    const imgs = container.querySelectorAll(".news-marquee-copy:first-child img");
    expect([imgs[0].getAttribute("width"), imgs[0].getAttribute("height")]).toEqual(["100", "44"]);
    expect((imgs[0] as HTMLElement).style.getPropertyValue("--logo-h")).toBe("");
    expect((imgs[1] as HTMLElement).style.getPropertyValue("--logo-h")).toBe("30");
    expect(container.querySelector(".news-marquee-copy:first-child b")?.textContent).toBe("Html");
    expect(container.querySelector(".news-marquee-row--reverse")).toBeNull();
    // The second copy can't be tabbed into.
    expect(
      [...container.querySelectorAll('[aria-hidden="true"] a')].every((a) => a.getAttribute("tabindex") === "-1"),
    ).toBe(true);
  });

  it("shows the local groups and how to start one", async () => {
    await render(<LocalGroupsSection />);
    for (const group of localGroups)
      await expect.element(page.getByRole("heading", { name: group.name, level: 3 })).toBeVisible();
    await expect.element(page.getByRole("link", { name: "Start a local group →" })).toHaveAttribute("target", "_blank");
  });

  it("links to every story", async () => {
    await render(<PeopleSection />);
    await expect
      .element(page.getByRole("link", { name: `Read all ${people.length} stories →` }))
      .toHaveAttribute("href", "/people");
    await expect
      .element(page.getByRole("link", { name: "Share your story →" }))
      .toHaveAttribute("href", "/people#share-your-story");
  });

  it("links to the shop", async () => {
    await render(<ShopBanner />);
    await expect.element(page.getByRole("link", { name: "Browse the shop →" })).toHaveAttribute("href", site.shopUrl);
    await expect.element(page.getByRole("img", { name: "PauseAI merchandise" })).toBeInTheDocument();
  });

  it("embeds the onboarding form", async () => {
    vi.spyOn(HTMLIFrameElement.prototype, "src", "set").mockImplementation(() => {});
    await render(<JoinSection />);
    await expect.element(page.getByRole("heading", { name: "Join PauseAI UK" })).toBeVisible();
    await expect.element(page.getByTitle("Get involved!")).toBeInTheDocument();
  });

  it("links to the WhatsApp community and the calendar", async () => {
    await render(<GetInvolved />);
    await expect
      .element(page.getByRole("link", { name: "Join the WhatsApp community" }))
      .toHaveAttribute("href", site.whatsappUrl);
    await expect.element(page.getByRole("link", { name: "event calendar" })).toHaveAttribute("href", site.social.luma);
  });

  it("introduces the staff, and links to the jobs page", async () => {
    const { container } = await render(<StaffSection />);
    for (const member of staff) await expect.element(page.getByRole("heading", { name: member.name })).toBeVisible();
    expect((container.querySelector(".avatar") as HTMLElement).style.backgroundImage).toContain(
      encodeURI(staff[0].imageSrc).replace(/\(/g, "%28").replace(/\)/g, "%29").slice(0, 10),
    );
    await expect.element(page.getByRole("link", { name: "We’re hiring →" })).toHaveAttribute("href", "/jobs");
  });
});
