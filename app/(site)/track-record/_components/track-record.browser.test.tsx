import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import HeroSwirl from "./HeroSwirl";
import Lightbox from "./Lightbox";
import Timeline from "./Timeline";
import { Shot, TimelineEntry } from "./TimelineEntry";

afterEach(async () => {
  vi.restoreAllMocks();
  await page.viewport(414, 896);
});

describe("HeroSwirl", () => {
  it("draws forty rotated rings", async () => {
    const { container } = await render(<HeroSwirl />);
    const rings = container.querySelectorAll("ellipse");
    expect(rings).toHaveLength(40);
    expect(rings[1].getAttribute("transform")).toBe("rotate(4.5 300 300)");
  });
});

describe("TimelineEntry and Shot", () => {
  it("dates an entry and links to it, marking the last one", async () => {
    const { container } = await render(
      <ol>
        <TimelineEntry id="first" month="June" year="2025" title="First">
          <p>Text</p>
        </TimelineEntry>
        <TimelineEntry id="last" month="May" year="2025" title="Last" finale>
          <Shot href="/full.jpg" src="/thumb.jpg" alt="A photo" sizes="25vw" wide />
          <Shot href="/full2.jpg" src="/thumb2.jpg" alt="Another" sizes="25vw" />
        </TimelineEntry>
      </ol>,
    );
    const entries = container.querySelectorAll("li.entry");
    expect(entries[0].className).toBe("entry");
    expect(entries[1].className).toBe("entry entry-finale");
    expect(entries[0].querySelector(".month")?.textContent).toBe("June");
    await expect.element(page.getByRole("button", { name: "Copy link to this entry" }).first()).toBeVisible();
    const shots = container.querySelectorAll("a.shot");
    expect([...shots].map((a) => a.className)).toEqual(["shot shot-wide", "shot"]);
    expect(shots[0].getAttribute("href")).toBe("/full.jpg");
  });

  it("lists the whole track record", async () => {
    const { container } = await render(<Timeline />);
    expect(container.querySelectorAll("li.entry").length).toBeGreaterThan(5);
    expect(container.querySelectorAll("li.entry-finale")).toHaveLength(1);
  });
});

describe("Lightbox", () => {
  function Gallery() {
    return (
      <>
        <ol style={{ paddingTop: 100 }}>
          {["a", "b", "c"].map((id) => (
            <li key={id} className="entry" id={id} style={{ height: 600 }}>
              <a className="shot" href={`/images/${id}.jpg`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt={id === "b" ? "" : `Photo ${id}`} />
              </a>
            </li>
          ))}
          <li>
            <a className="shot" href="/images/no-img.jpg">
              Text only
            </a>
          </li>
        </ol>
        <Lightbox />
      </>
    );
  }

  it("opens a photo full size, steps through them, and closes", async () => {
    const { container } = await render(<Gallery />);
    const lb = container.querySelector("#lightbox") as HTMLElement;
    const img = lb.querySelector(".lb-image") as HTMLImageElement;
    const isOpen = () => lb.classList.contains("open");

    (container.querySelector('a[href="/images/a.jpg"]') as HTMLElement).click();
    expect(isOpen()).toBe(true);
    expect(lb.getAttribute("aria-hidden")).toBe("false");
    expect(img.getAttribute("src")).toBe("/images/a.jpg");
    expect(img.alt).toBe("Photo a");

    (lb.querySelector(".lb-next") as HTMLElement).click();
    expect(img.getAttribute("src")).toBe("/images/b.jpg");
    expect(img.alt).toBe("");
    (lb.querySelector(".lb-prev") as HTMLElement).click();
    (lb.querySelector(".lb-prev") as HTMLElement).click();
    // Wraps round to the last shot, which has no image inside.
    expect(img.getAttribute("src")).toBe("/images/no-img.jpg");
    expect(img.alt).toBe("");

    await userEvent.keyboard("{ArrowRight}");
    expect(img.getAttribute("src")).toBe("/images/a.jpg");
    await userEvent.keyboard("{ArrowLeft}");
    expect(img.getAttribute("src")).toBe("/images/no-img.jpg");
    await userEvent.keyboard("{Enter}");
    expect(isOpen()).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(isOpen()).toBe(false);
    expect(img.hasAttribute("src")).toBe(false);

    // Keys do nothing while it's closed.
    await userEvent.keyboard("{ArrowRight}");
    expect(img.hasAttribute("src")).toBe(false);

    (container.querySelector('a[href="/images/c.jpg"]') as HTMLElement).click();
    (lb.querySelector(".lb-image") as HTMLElement).click();
    expect(isOpen()).toBe(true);
    lb.click();
    expect(isOpen()).toBe(false);
    (container.querySelector('a[href="/images/c.jpg"]') as HTMLElement).click();
    (lb.querySelector(".lb-close") as HTMLElement).click();
    expect(isOpen()).toBe(false);
  });

  it("highlights the entry nearest the top of the screen", async () => {
    const { container } = await render(<Gallery />);
    const entries = container.querySelectorAll(".entry");
    expect(entries[0].classList.contains("is-active")).toBe(true);
    entries[2].scrollIntoView({ block: "center" });
    await expect.poll(() => entries[2].classList.contains("is-active")).toBe(true);
    expect(entries[0].classList.contains("is-active")).toBe(false);
  });

  it("picks the topmost when several entries are near the top", async () => {
    await page.viewport(800, 1000);
    // Short entries, so several sit in the band near the top of the screen at once.
    const { container } = await render(
      <>
        <ol>
          {Array.from({ length: 30 }, (_, i) => (
            <li key={i} className="entry" style={{ height: 40 }} />
          ))}
        </ol>
        <Lightbox />
      </>,
    );
    const entries = [...container.querySelectorAll(".entry")];
    entries[15].scrollIntoView({ block: "start" });
    await expect.poll(() => entries.findIndex((e) => e.classList.contains("is-active"))).toBeGreaterThan(0);
    expect(entries.filter((e) => e.classList.contains("is-active"))).toHaveLength(1);
  });

  it("copes with a page with no entries", async () => {
    const { unmount } = await render(<Lightbox />);
    await unmount();
  });
});
