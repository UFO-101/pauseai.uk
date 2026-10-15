import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import HeroSwirl from "./HeroSwirl";
import Timeline from "./Timeline";
import { ShotLink } from "./Gallery";
import { Shot, TimelineEntry } from "./TimelineEntry";
import { TimelineList } from "./TimelineList";

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
      <TimelineList>
        <TimelineEntry id="first" month="June" year="2025" title="First">
          <p>Text</p>
        </TimelineEntry>
        <TimelineEntry id="last" month="May" year="2025" title="Last" finale>
          <Shot href="/full.jpg" src="/thumb.jpg" alt="A photo" sizes="25vw" wide />
          <Shot href="/full2.jpg" src="/thumb2.jpg" alt="Another" sizes="25vw" />
        </TimelineEntry>
      </TimelineList>,
    );
    const entries = container.querySelectorAll("li.entry");
    expect(entries[0].classList.contains("entry")).toBe(true);
    expect(entries[0].classList.contains("entry-finale")).toBe(false);
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

describe("TimelineList", () => {
  const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  function Gallery() {
    return (
      <div style={{ paddingTop: 100 }}>
        <TimelineList>
          {["a", "b", "c"].map((id) => (
            <TimelineEntry key={id} id={id} month="May" year="2025" title={id}>
              <div style={{ height: 600 }}>
                <Shot href={`/images/${id}.jpg`} src={PIXEL} alt={id === "b" ? "" : `Photo ${id}`} sizes="25vw" />
              </div>
            </TimelineEntry>
          ))}
          <TimelineEntry id="d" month="May" year="2025" title="d">
            <ShotLink className="shot" href="/images/d.jpg" alt="Photo d">
              Text only
            </ShotLink>
          </TimelineEntry>
        </TimelineList>
      </div>
    );
  }

  // The page's styles aren't loaded here, so the lightbox doesn't cover the
  // page, and clicks go straight to the elements.
  const dialog = () => page.getByRole("dialog");
  const photo = () => document.querySelector(".lb-image") as HTMLImageElement;
  const shown = () => photo()?.getAttribute("src");
  const press = (name: string) => (page.getByRole("button", { name }).element() as HTMLElement).click();

  it("opens a photo full size, steps through them, and closes", async () => {
    const { container } = await render(<Gallery />);
    const shot = (id: string) => container.querySelector(`a[href="/images/${id}.jpg"]`) as HTMLElement;
    await expect.element(dialog()).not.toBeInTheDocument();

    shot("a").click();
    await expect.element(dialog()).toHaveClass("lightbox open");
    await expect.poll(shown).toBe("/images/a.jpg");
    expect(photo().alt).toBe("Photo a");

    press("Next");
    await expect.poll(shown).toBe("/images/b.jpg");
    expect(photo().alt).toBe("");
    press("Previous");
    press("Previous");
    // Wraps round to the last shot.
    await expect.poll(shown).toBe("/images/d.jpg");

    await userEvent.keyboard("{ArrowRight}");
    await expect.poll(shown).toBe("/images/a.jpg");
    await userEvent.keyboard("{ArrowLeft}");
    await expect.poll(shown).toBe("/images/d.jpg");
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog()).not.toBeInTheDocument();

    // A click on the photo leaves it open; one on the backdrop closes it.
    shot("c").click();
    await expect.poll(shown).toBe("/images/c.jpg");
    photo().click();
    await expect.element(dialog()).toBeInTheDocument();
    (dialog().element() as HTMLElement).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    shot("c").click();
    await expect.element(dialog()).toBeInTheDocument();
    press("Close");
    await expect.element(dialog()).not.toBeInTheDocument();
  });

  it("forgets a photo that goes", async () => {
    const entry = (hrefs: string[]) => (
      <TimelineList>
        <TimelineEntry id="a" month="May" year="2025" title="a">
          {hrefs.map((href) => (
            <Shot key={href} href={href} src={PIXEL} alt={href} sizes="25vw" />
          ))}
        </TimelineEntry>
      </TimelineList>
    );
    const { container, rerender } = await render(entry(["/a.jpg", "/b.jpg", "/c.jpg"]));
    await rerender(entry(["/a.jpg", "/c.jpg"]));
    (container.querySelector('a[href="/a.jpg"]') as HTMLElement).click();
    await expect.poll(shown).toBe("/a.jpg");
    press("Next");
    await expect.poll(shown).toBe("/c.jpg");
  });

  it("highlights the entry nearest the top of the screen", async () => {
    const { container } = await render(<Gallery />);
    const entries = container.querySelectorAll<HTMLElement>(".entry");
    await expect.element(entries[0]).toHaveClass("is-active");
    entries[2].scrollIntoView({ block: "center" });
    await expect.element(entries[2]).toHaveClass("is-active");
    expect(container.querySelectorAll(".is-active")).toHaveLength(1);

    // Scrolled past them all, the last one stays highlighted.
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(container.querySelectorAll(".is-active")).toHaveLength(1);
  });

  it("highlights the first entry until one reaches the top of the screen", async () => {
    const { container } = await render(
      <>
        <div style={{ height: 2000 }} />
        <TimelineList>
          {["a", "b"].map((id) => (
            <TimelineEntry key={id} id={id} month="May" year="2025" title={id}>
              {null}
            </TimelineEntry>
          ))}
        </TimelineList>
      </>,
    );
    await expect.element(container.querySelector<HTMLElement>("#a")!).toHaveClass("is-active");
    expect(container.querySelector("#b")!.classList.contains("is-active")).toBe(false);
  });

  it("picks the topmost when several entries are near the top", async () => {
    await page.viewport(800, 1000);
    // Short entries, so several sit in the band near the top of the screen at once.
    const { container } = await render(
      <TimelineList>
        {Array.from({ length: 30 }, (_, i) => (
          <TimelineEntry key={i} id={`e${i}`} month="May" year="2025" title={`${i}`}>
            {null}
          </TimelineEntry>
        ))}
      </TimelineList>,
    );
    const entries = [...container.querySelectorAll(".entry")];
    entries.forEach((entry) => ((entry as HTMLElement).style.height = "40px"));
    entries[15].scrollIntoView({ block: "start" });
    await expect.poll(() => entries.findIndex((e) => e.classList.contains("is-active"))).toBeGreaterThan(0);
    expect(entries.filter((e) => e.classList.contains("is-active"))).toHaveLength(1);
  });

  it("copes with an empty list", async () => {
    const { unmount } = await render(<TimelineList>{null}</TimelineList>);
    await unmount();
  });
});
