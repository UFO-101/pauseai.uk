import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import Timeline from "./Timeline";
import { Gallery, ShotLink } from "./Gallery";
import { Photos, Shot } from "./Photos";
import { EntryList, EntryText, TimelineEntry } from "./TimelineEntry";
import { TimelineList } from "./TimelineList";

afterEach(async () => {
  vi.restoreAllMocks();
  await page.viewport(414, 896);
});

describe("TimelineEntry and Shot", () => {
  it("dates an entry, titles it and links to it", async () => {
    const { container } = await render(
      <TimelineList>
        <TimelineEntry id="first" month="June" year="2025" title="First">
          <p>Text</p>
        </TimelineEntry>
        <TimelineEntry id="last" month="May" year="2025" title="Last">
          <EntryText>
            <EntryList>
              <li>An item</li>
            </EntryList>
          </EntryText>
          <Shot href="/full.jpg" src="/thumb.jpg" alt="A photo" sizes="25vw" />
        </TimelineEntry>
      </TimelineList>,
    );
    const entries = container.querySelectorAll("ol > li");
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe("first");
    expect(entries[0].querySelector("aside")?.textContent).toBe("June2025");
    await expect.element(page.getByRole("heading", { level: 3, name: "Last" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Copy link to this entry" }).first()).toBeVisible();
    const item = page.getByText("An item").element();
    expect(getComputedStyle(item, "::before").width).toBe("8px");
    await expect.element(page.getByRole("link", { name: "A photo" })).toHaveAttribute("href", "/full.jpg");
  });

  it("lists the whole track record", async () => {
    const { container } = await render(<Timeline />);
    expect(container.querySelectorAll("ol > li").length).toBeGreaterThan(5);
  });
});

describe("Photos", () => {
  it("spans a wide shot across three, and a tall one down four", async () => {
    await page.viewport(1280, 900);
    await render(
      <Gallery>
        <Photos count={3}>
          <Shot href="/w.jpg" src="/w-thumb.jpg" alt="Wide" sizes="25vw" wide />
        </Photos>
        <Photos count={4}>
          <Shot href="/t.jpg" src="/t-thumb.jpg" alt="Tall" sizes="25vw" tall />
        </Photos>
      </Gallery>,
    );
    const shot = (name: string) => getComputedStyle(page.getByRole("link", { name }).element());
    expect(shot("Wide").gridColumnStart).toBe("1");
    expect(shot("Wide").gridColumnEnd).toBe("-1");
    expect(shot("Tall").gridRowStart).toBe("span 2");
  });

  it("shows a single shot whole, at the size it's given", async () => {
    await render(
      <Gallery>
        <Photos count={1}>
          <Shot href="/a.jpg" src="/a-thumb.jpg" alt="Whole" sizes="640px" width={960} height={540} />
        </Photos>
      </Gallery>,
    );
    const image = page.getByRole("img", { name: "Whole" }).element();
    expect(image.getAttribute("width")).toBe("960");
    expect(getComputedStyle(image).objectFit).toBe("contain");
  });
});

describe("TimelineList", () => {
  const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  function Entries() {
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
            <ShotLink className="" href="/images/d.jpg" alt="Photo d">
              Text only
            </ShotLink>
          </TimelineEntry>
        </TimelineList>
      </div>
    );
  }

  // The lightbox covers the page, so the clicks are the elements' own,
  // not a pointer's.
  const dialog = () => page.getByRole("dialog");
  const photo = () => document.querySelector("[role=dialog] img") as HTMLImageElement;
  const opacity = () => getComputedStyle(photo()).opacity;
  const shown = () => photo()?.getAttribute("src");
  const press = (name: string) => (page.getByRole("button", { name }).element() as HTMLElement).click();

  it("opens a photo full size, steps through them, and closes", async () => {
    const { container } = await render(<Entries />);
    const shot = (id: string) => container.querySelector(`a[href="/images/${id}.jpg"]`) as HTMLElement;
    await expect.element(dialog()).not.toBeInTheDocument();

    shot("a").click();
    await expect.element(dialog()).toBeVisible();
    // The photo doesn't exist, so it never loads, and stays hidden.
    expect(opacity()).toBe("0");
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

  it("fades a photo in once it has loaded", async () => {
    // A 2x1 GIF, so it isn't the same as the thumbnail.
    const FULL = "data:image/gif;base64,R0lGODlhAgABAIAAAP///wAAACH5BAEAAAAALAAAAAACAAEAAAICBAoAOw==";
    const { container } = await render(
      <TimelineList>
        <TimelineEntry id="a" month="May" year="2025" title="a">
          <Shot href={FULL} src={PIXEL} alt="A" sizes="25vw" />
        </TimelineEntry>
      </TimelineList>,
    );
    const link = container.querySelector(`a[href="${FULL}"]`) as HTMLElement;
    link.click();
    await expect.poll(shown).toBe(FULL);
    await expect.poll(opacity).toBe("1");
    // Opened again, it's a new image, hidden until it has loaded.
    press("Close");
    await expect.element(dialog()).not.toBeInTheDocument();
    link.click();
    await expect.poll(shown).toBe(FULL);
    await expect.poll(opacity).toBe("1");
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
    const { container } = await render(<Entries />);
    const entries = container.querySelectorAll<HTMLElement>("ol > li");
    await expect.element(entries[0]).toHaveAttribute("data-active");
    entries[2].scrollIntoView({ block: "center" });
    await expect.element(entries[2]).toHaveAttribute("data-active");
    expect(container.querySelectorAll("[data-active]")).toHaveLength(1);

    // Scrolled past them all, the last one stays highlighted.
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(container.querySelectorAll("[data-active]")).toHaveLength(1);
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
    await expect.element(container.querySelector<HTMLElement>("#a")!).toHaveAttribute("data-active");
    expect(container.querySelector("#b")!.hasAttribute("data-active")).toBe(false);
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
    const entries = [...container.querySelectorAll("ol > li")];
    entries.forEach((entry) => ((entry as HTMLElement).style.height = "40px"));
    entries[15].scrollIntoView({ block: "start" });
    await expect.poll(() => entries.findIndex((e) => e.hasAttribute("data-active"))).toBeGreaterThan(0);
    expect(entries.filter((e) => e.hasAttribute("data-active"))).toHaveLength(1);
  });

  it("copes with an empty list", async () => {
    const { unmount } = await render(<TimelineList>{null}</TimelineList>);
    await unmount();
  });
});
