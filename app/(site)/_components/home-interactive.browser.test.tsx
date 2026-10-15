import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { localGroups } from "@/lib/content/local-groups";
import { people } from "@/lib/content/people";
import HeroMarqueeEffects from "./HeroMarqueeEffects";
import LocalGroupsMap from "./LocalGroupsMap";
import OnboardingFormEmbed from "./OnboardingFormEmbed";
import PeopleCarousel from "./PeopleCarousel";

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  await page.viewport(414, 896);
});

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** A marquee like the home page's: a track holding one copy of its items. */
function Marquee({ src = PIXEL, withCopy = true }: { src?: string; withCopy?: boolean }) {
  return (
    <div className="hero-marquee-track" data-testid="track">
      {withCopy && (
        <div className="hero-marquee-copy" style={{ display: "inline-block", width: 300 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a plain image, as next/image renders */}
          <img src={src} alt="" width={300} height={10} />
        </div>
      )}
    </div>
  );
}

describe("HeroMarqueeEffects", () => {
  it("sets each track's scroll distance to one copy's width, and marks loaded photos", async () => {
    await render(
      <>
        <Marquee />
        <HeroMarqueeEffects />
      </>,
    );
    const track = page.getByTestId("track").element() as HTMLElement;
    await expect.poll(() => track.style.getPropertyValue("--copy-shift")).toBe("-300px");
    await expect.poll(() => track.querySelector("img")!.classList.contains("is-loaded")).toBe(true);
  });

  it("marks a photo once it loads, or fails, and ignores tracks without a copy", async () => {
    await render(
      <>
        <Marquee src="/images/logos/Pause-Symbol.svg?slow" />
        <Marquee src="/no-such-image.png" />
        <Marquee withCopy={false} />
        <HeroMarqueeEffects />
      </>,
    );
    const imgs = document.querySelectorAll(".hero-marquee-track img");
    await expect.poll(() => [...imgs].every((img) => img.classList.contains("is-loaded"))).toBe(true);
  });

  it("falls back to window resizes without ResizeObserver, and to no font wait without document.fonts", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const fonts = Object.getOwnPropertyDescriptor(Document.prototype, "fonts")!;
    Object.defineProperty(document, "fonts", { configurable: true, value: undefined });
    try {
      const { unmount } = await render(
        <>
          <Marquee />
          <HeroMarqueeEffects />
        </>,
      );
      const track = page.getByTestId("track").element() as HTMLElement;
      track.style.removeProperty("--copy-shift");
      window.dispatchEvent(new Event("resize"));
      expect(track.style.getPropertyValue("--copy-shift")).toBe("-300px");
      await unmount();
    } finally {
      Object.defineProperty(document, "fonts", fonts);
      delete (document as unknown as Record<string, unknown>).fonts;
    }
  });

  it("leaves a zero-width copy alone", async () => {
    await render(
      <>
        <div className="hero-marquee-track" data-testid="empty">
          <div className="hero-marquee-copy" style={{ width: 0 }} />
        </div>
        <HeroMarqueeEffects />
      </>,
    );
    expect((page.getByTestId("empty").element() as HTMLElement).style.getPropertyValue("--copy-shift")).toBe("");
  });
});

describe("OnboardingFormEmbed", () => {
  const ORIGIN = "https://pauseai.info";
  const post = (data: unknown, origin = ORIGIN) => window.dispatchEvent(new MessageEvent("message", { data, origin }));

  /** Renders the embed without letting the iframe load the real form. */
  async function renderEmbed() {
    const srcs: string[] = [];
    vi.spyOn(HTMLIFrameElement.prototype, "src", "set").mockImplementation(function (
      this: HTMLIFrameElement,
      v: string,
    ) {
      srcs.push(v);
      this.setAttribute("src", v);
    });
    vi.spyOn(HTMLIFrameElement.prototype, "src", "get").mockImplementation(function (this: HTMLIFrameElement) {
      return this.getAttribute("src") ?? "";
    });
    const screen = await render(<OnboardingFormEmbed />);
    const iframe = screen.container.querySelector("iframe")!;
    return { ...screen, iframe, srcs };
  }

  it("points the iframe at the form only once listening, and shows a skeleton until it reports in", async () => {
    // The iframe is attached with no src, so src is only set by the effect.
    const { container, srcs } = await renderEmbed();
    expect(srcs).toEqual(["https://pauseai.info/embed/onboarding-form/?country=United+Kingdom&bg=FDF8F3"]);
    expect(container.querySelector(".onboarding-embed-skeleton")).not.toBeNull();
    post({ height: 900 });
    await expect.poll(() => container.querySelector(".onboarding-embed-skeleton")).toBeNull();
    expect(container.querySelector("iframe")!.getAttribute("height")).toBe("900");
  });

  it("ignores messages from other sites and messages without a height", async () => {
    const { container } = await renderEmbed();
    post({ height: 10 }, "https://evil.example");
    post({ something: "else" });
    post(null);
    expect(container.querySelector(".onboarding-embed-skeleton")).not.toBeNull();
    expect(container.querySelector("iframe")!.getAttribute("height")).toBe("1483");
  });

  it("tells Google Tag Manager about a signup", async () => {
    await renderEmbed();
    const w = window as typeof window & { dataLayer?: unknown[] };
    delete w.dataLayer;
    post({ event: "onboarding_signup_complete" });
    expect(w.dataLayer).toEqual([{ event: "onboarding_signup_complete" }]);
    post({ event: "onboarding_signup_complete" });
    expect(w.dataLayer).toHaveLength(2);
  });

  it("offers a link if the form never reports in, saying whether it loaded at all", async () => {
    // Only timeouts are faked, so React can still render between steps.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const { container, iframe } = await renderEmbed();
    await vi.advanceTimersByTimeAsync(8000);
    await frame();
    const fallback = () => container.querySelector(".onboarding-embed-fallback")?.textContent;
    expect(fallback()).toBe("Form didn't load. Open it in a new tab.");
    iframe.dispatchEvent(new Event("load"));
    await frame();
    expect(fallback()).toBe("Form is taking a while to load. Open it in a new tab.");
    expect(container.querySelector(".onboarding-embed-skeleton")).toBeNull();
  });

  it("doesn't offer the link when the form reported in", async () => {
    vi.useFakeTimers();
    const { container } = await renderEmbed();
    post({ height: 900 });
    await vi.advanceTimersByTimeAsync(8000);
    expect(container.querySelector(".onboarding-embed-fallback")).toBeNull();
  });

  it("scrolls back to the top of a shorter step, but only after the reader used the form", async () => {
    vi.useFakeTimers();
    const { container, iframe } = await renderEmbed();
    const scroll = vi.spyOn(iframe, "scrollIntoView").mockImplementation(() => {});
    vi.spyOn(iframe, "getBoundingClientRect").mockReturnValue(new DOMRect(0, -200, 300, 1000));

    post({ height: 1400 });
    await vi.advanceTimersByTimeAsync(500);
    // Shrinking before anyone used the form is a reflow: no scroll.
    post({ height: 1300 });
    expect(scroll).not.toHaveBeenCalled();
    expect(container.firstElementChild!.className).toBe("onboarding-embed-wrap is-pristine");

    // Focus moving into the iframe means the reader is using the form.
    iframe.focus();
    window.dispatchEvent(new Event("blur"));
    await vi.advanceTimersByTimeAsync(0);
    expect(container.firstElementChild!.className).toBe("onboarding-embed-wrap");
    post({ height: 1200 });
    expect(scroll).toHaveBeenCalledWith({ block: "start" });

    // Growing, or a shrink while the top is on screen, doesn't scroll.
    scroll.mockClear();
    post({ height: 1250 });
    vi.spyOn(iframe, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 100, 300, 1000));
    post({ height: 1100 });
    expect(scroll).not.toHaveBeenCalled();
  });

  it("only counts a blur as using the form when focus went into it", async () => {
    vi.useFakeTimers();
    const { container } = await renderEmbed();
    window.dispatchEvent(new Event("blur"));
    await vi.advanceTimersByTimeAsync(0);
    expect(container.firstElementChild!.className).toBe("onboarding-embed-wrap is-pristine");
  });

  it("doesn't set the src again if the iframe already has one", async () => {
    vi.spyOn(HTMLIFrameElement.prototype, "getAttribute").mockReturnValue("about:blank");
    const set = vi.spyOn(HTMLIFrameElement.prototype, "src", "set").mockImplementation(() => {});
    await render(<OnboardingFormEmbed />);
    expect(set).not.toHaveBeenCalled();
  });
});

describe("LocalGroupsMap", () => {
  it("shows the cards alone on a narrow screen, without fetching the map", async () => {
    const fetchSpy = vi.spyOn(window, "fetch");
    const { container } = await render(<LocalGroupsMap />);
    for (const group of localGroups)
      await expect
        .element(page.getByRole("link", { name: new RegExp(group.name) }).first())
        .toHaveAttribute("href", group.href);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(container.querySelector(".local-groups-map-canvas svg")).toBeNull();
  });

  it("draws the UK map with a pin and connector per group on a wide screen, highlighting on hover", async () => {
    await page.viewport(1280, 900);
    const { container } = await render(<LocalGroupsMap />);
    await expect.poll(() => container.querySelectorAll(".uk-map-pin").length).toBe(localGroups.length);
    await expect.poll(() => container.querySelectorAll(".local-groups-map-link").length).toBe(localGroups.length);
    const card = page.getByRole("link", { name: new RegExp(localGroups[0].name) });
    await card.hover();
    await expect.poll(() => container.querySelector(".local-groups-map-link.active")).not.toBeNull();
    await expect.poll(() => container.querySelector(".uk-map-pin.active")).not.toBeNull();
    // Leaving one card doesn't clear another's highlight.
    await page.getByRole("link", { name: new RegExp(localGroups[1].name) }).hover();
    await expect.poll(() => container.querySelectorAll(".local-groups-map-link.active").length).toBe(1);
    await userEvent.unhover(page.getByRole("link", { name: new RegExp(localGroups[1].name) }));
    await expect.poll(() => container.querySelector(".local-groups-map-link.active")).toBeNull();
    // Pins highlight their group too.
    const pin = container.querySelector(".uk-map-pin") as SVGElement;
    pin.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await expect.poll(() => container.querySelector(".uk-map-pin.active")).not.toBeNull();
    pin.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
    await expect.poll(() => container.querySelector(".uk-map-pin.active")).toBeNull();
    // Connectors follow a window resize.
    window.dispatchEvent(new Event("resize"));
  });

  it("renders the cards alone on the server, and adds the map once hydrated on a wide screen", async () => {
    await page.viewport(1280, 900);
    const host = document.createElement("div");
    host.innerHTML = renderToString(<LocalGroupsMap />);
    document.body.append(host);
    expect(host.querySelectorAll(".local-groups-map-card")).toHaveLength(localGroups.length);
    expect(host.querySelector(".local-groups-map-canvas svg")).toBeNull();
    const root = await act(async () => hydrateRoot(host, <LocalGroupsMap />));
    await expect.poll(() => host.querySelectorAll(".uk-map-pin").length).toBe(localGroups.length);
    await act(async () => root.unmount());
    host.remove();
  });

  it("only clears the highlight of the group being left", async () => {
    await page.viewport(1280, 900);
    const { container } = await render(<LocalGroupsMap />);
    await expect.poll(() => container.querySelectorAll(".uk-map-pin").length).toBe(localGroups.length);
    for (const selector of [".local-groups-map-card", ".uk-map-pin"]) {
      const [first, second] = container.querySelectorAll(selector);
      first.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }));
      await expect.poll(() => container.querySelectorAll(".uk-map-pin.active").length).toBe(1);
      // A stray leave from another group, say as the pointer crosses it, keeps the first highlighted.
      second.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: first }));
      await new Promise((r) => requestAnimationFrame(r));
      expect(container.querySelectorAll(".uk-map-pin.active")).toHaveLength(1);
      first.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
      await expect.poll(() => container.querySelector(".uk-map-pin.active")).toBeNull();
    }
  });

  it("skips groups whose pin has gone when a resize arrives as the map is dropped", async () => {
    await page.viewport(1280, 900);
    // Keep hold of the resize callback, to call it after the map has gone.
    const callbacks: ResizeObserverCallback[] = [];
    const Real = window.ResizeObserver;
    vi.stubGlobal(
      "ResizeObserver",
      class extends Real {
        constructor(cb: ResizeObserverCallback) {
          super(cb);
          callbacks.push(cb);
        }
      },
    );
    const { container } = await render(<LocalGroupsMap />);
    await expect.poll(() => container.querySelectorAll(".local-groups-map-link").length).toBe(localGroups.length);
    await page.viewport(800, 900);
    await expect.poll(() => container.querySelector(".local-groups-map-canvas svg")).toBeNull();
    await act(async () => callbacks.at(-1)!([], {} as ResizeObserver));
    expect(container.querySelectorAll(".local-groups-map-link")).toHaveLength(0);
  });

  it("takes a resize that arrives after it has unmounted in its stride", async () => {
    await page.viewport(1280, 900);
    // Keep hold of the resize callback, to call it once the map has gone, as
    // a resize queued while navigating away (or a hot reload) can.
    const callbacks: ResizeObserverCallback[] = [];
    const Real = window.ResizeObserver;
    vi.stubGlobal(
      "ResizeObserver",
      class extends Real {
        constructor(cb: ResizeObserverCallback) {
          super(cb);
          callbacks.push(cb);
        }
      },
    );
    const { container, unmount } = await render(<LocalGroupsMap />);
    await expect.poll(() => container.querySelectorAll(".local-groups-map-link").length).toBe(localGroups.length);
    await unmount();
    expect(() => callbacks.at(-1)!([], {} as ResizeObserver)).not.toThrow();
  });

  it("drops the map when the screen narrows, and keeps the cards if the map can't load", async () => {
    await page.viewport(1280, 900);
    vi.spyOn(window, "fetch").mockRejectedValue(new Error("offline"));
    const { container } = await render(<LocalGroupsMap />);
    await page.viewport(800, 900);
    await expect.poll(() => container.querySelector(".local-groups-map-canvas svg")).toBeNull();
    expect(container.querySelectorAll(".local-groups-map-card")).toHaveLength(localGroups.length);
  });

  it("doesn't use a map that arrives after it has gone", async () => {
    await page.viewport(1280, 900);
    let resolve: (r: Response) => void = () => {};
    vi.spyOn(window, "fetch").mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = await render(<LocalGroupsMap />);
    await unmount();
    resolve(new Response(JSON.stringify({ type: "Topology", objects: {}, arcs: [] })));
  });

  it("skips map features with no shape", async () => {
    await page.viewport(1280, 900);
    const topology = {
      type: "Topology",
      arcs: [
        [
          [0, 0],
          [1, 1],
        ],
      ],
      objects: { uk: { type: "GeometryCollection", geometries: [{ type: null }, { type: "LineString", arcs: [0] }] } },
    };
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify(topology)));
    const { container } = await render(<LocalGroupsMap />);
    await expect.poll(() => container.querySelectorAll(".uk-map-outline").length).toBe(2);
    expect(container.querySelectorAll(".uk-map-outline")[0].getAttribute("d")).toBeNull();
  });
});

describe("PeopleCarousel", () => {
  const few = people.slice(0, 6);

  it("scrolls a card at a time with the arrow buttons", async () => {
    const { container } = await render(<PeopleCarousel people={few} />);
    const track = container.querySelector(".people-carousel-track") as HTMLElement;
    const scroll = vi.spyOn(track, "scrollBy");
    // The arrows are hidden by CSS at this narrow test width, so click them directly.
    (container.querySelector('[aria-label="Next story"]') as HTMLElement).click();
    const step = (container.querySelector(".person-card") as HTMLElement).getBoundingClientRect().width + 24;
    expect(scroll).toHaveBeenLastCalledWith({ left: step, behavior: "smooth" });
    (container.querySelector('[aria-label="Previous story"]') as HTMLElement).click();
    expect(scroll).toHaveBeenLastCalledWith({ left: -step, behavior: "smooth" });
  });

  it("scrolls by the track's width when it has no cards", async () => {
    const { container } = await render(<PeopleCarousel people={[]} />);
    const track = container.querySelector(".people-carousel-track") as HTMLElement;
    const scroll = vi.spyOn(track, "scrollBy");
    (container.querySelector('[aria-label="Next story"]') as HTMLElement).click();
    expect(scroll).toHaveBeenCalledWith({ left: track.clientWidth, behavior: "smooth" });
  });

  it("drags with the mouse, without the drag also clicking what it ends on", async () => {
    const { container } = await render(<PeopleCarousel people={few} />);
    const track = container.querySelector(".people-carousel-track") as HTMLElement;
    vi.spyOn(track, "setPointerCapture").mockImplementation(() => {});
    vi.spyOn(track, "hasPointerCapture").mockReturnValue(true);
    const release = vi.spyOn(track, "releasePointerCapture").mockImplementation(() => {});
    const clicked = vi.fn();
    track.addEventListener("click", clicked);
    const pointer = (type: string, x: number, extra: PointerEventInit = {}) =>
      track.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerType: "mouse",
          button: 0,
          clientX: x,
          pointerId: 1,
          ...extra,
        }),
      );

    // A drag scrolls and swallows the click that follows.
    pointer("pointerdown", 200);
    pointer("pointermove", 198);
    expect(track.classList.contains("dragging")).toBe(false);
    pointer("pointermove", 100);
    await expect.poll(() => track.classList.contains("dragging")).toBe(true);
    pointer("pointerup", 100);
    track.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clicked).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalled();

    // A plain click still gets through.
    pointer("pointerdown", 100);
    pointer("pointerup", 100);
    track.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clicked).toHaveBeenCalledTimes(1);

    // A drag that leaves the track doesn't swallow the next real click.
    pointer("pointerdown", 200);
    pointer("pointermove", 50);
    // React's onPointerLeave comes from pointerout, with the pointer going outside the track.
    pointer("pointerout", 50, { relatedTarget: document.body });
    track.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  it("leaves touch, pen and right-clicks to the browser", async () => {
    const { container } = await render(<PeopleCarousel people={few} />);
    const track = container.querySelector(".people-carousel-track") as HTMLElement;
    const capture = vi.spyOn(track, "setPointerCapture");
    vi.spyOn(track, "hasPointerCapture").mockReturnValue(false);
    track.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", button: 0 }));
    track.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 2 }));
    track.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse", clientX: 10 }));
    track.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerType: "mouse" }));
    expect(capture).not.toHaveBeenCalled();
  });

  it("gives focus back to a link pressed to start a drag", async () => {
    const { container } = await render(<PeopleCarousel people={few} />);
    const track = container.querySelector(".people-carousel-track") as HTMLElement;
    vi.spyOn(track, "setPointerCapture").mockImplementation(() => {});
    const button = container.querySelector(".person-card button, .person-card a") as HTMLElement | null;
    const target = button ?? track;
    target.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        button: 0,
        pointerId: 2,
      }),
    );
    if (button) expect(document.activeElement).toBe(button);
  });
});
