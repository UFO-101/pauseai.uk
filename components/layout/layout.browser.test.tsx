import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { site } from "@/lib/content/site";
import { navigation } from "@/tests/browser/navigation";
import CookieConsent, { cookieDomains, CookieSettingsLink } from "./CookieConsent";
import Footer from "./Footer";
import FooterYear from "./FooterYear";
import JsonLd from "./JsonLd";
import Nav from "./Nav";
import NoAnalytics from "./NoAnalytics";

type GaWindow = typeof window & {
  __gaLoaded?: boolean;
  __gtmLoaded?: boolean;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};
const w = window as GaWindow;

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await page.viewport(414, 896);
});

describe("Footer, FooterYear, JsonLd and NoAnalytics", () => {
  it("fills in this year, if there is a place for it", async () => {
    await render(
      <>
        <Footer />
        <FooterYear />
      </>,
    );
    await expect.element(page.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", site.social.instagram);
    expect(document.getElementById("year")?.textContent).toBe(String(new Date().getFullYear()));
  });

  it("does nothing on a page without a year", async () => {
    await render(<FooterYear />);
    expect(document.getElementById("year")).toBeNull();
  });

  it("writes structured data, escaping anything that could close the tag", async () => {
    const { container } = await render(<JsonLd data={{ name: "</script><b>" }} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    expect(script.innerHTML).toBe('{"name":"\\u003c/script>\\u003cb>"}');
    expect(JSON.parse(script.innerHTML)).toEqual({ name: "</script><b>" });
  });

  it("marks the page as having no analytics", async () => {
    await render(<NoAnalytics />);
    expect(document.body.hasAttribute("data-no-analytics")).toBe(true);
  });
});

describe("Nav", () => {
  it("shows the PauseAI UK logo, and a local group's branding on its page", async () => {
    const { container, rerender } = await render(<Nav />);
    await expect.element(page.getByRole("img", { name: "PauseAI UK" })).toBeInTheDocument();
    // On the home page, in-page links stay in-page.
    expect(container.querySelector('a.pill[href="#join"]')).not.toBeNull();

    navigation.pathname = "/manchester";
    await rerender(<Nav />);
    expect(container.querySelector(".brand-mark")?.getAttribute("src")).toContain("manchester_logo");
    expect(container.querySelector('a.pill[href="/#join"]')).not.toBeNull();

    navigation.pathname = "/glasgow/";
    await rerender(<Nav />);
    expect(container.querySelector(".brand-tagline")?.textContent).toBe("Glasgow Group");
  });

  it("sets the header height for the stylesheet", async () => {
    await render(<Nav />);
    expect(document.documentElement.style.getPropertyValue("--site-header-h")).toMatch(/px$/);
  });

  it("opens and closes the mobile menu", async () => {
    const { container } = await render(<Nav />);
    const burger = container.querySelector(".burger") as HTMLElement;
    const nav = container.querySelector("nav")!;
    burger.click();
    await expect.element(nav).toHaveClass("open");
    expect(burger.getAttribute("aria-expanded")).toBe("true");
    burger.click();
    await expect.element(nav).not.toHaveClass("open");
    expect(burger.getAttribute("aria-expanded")).toBe("false");

    // A plain link closes the menu.
    burger.click();
    await expect.element(nav).toHaveClass("open");
    container.addEventListener("click", (e) => e.preventDefault());
    const people = [...nav.querySelectorAll("a")].find((a) => a.textContent === "People")!;
    people.click();
    await expect.element(nav).not.toHaveClass("open");

    // On a touch screen, a dropdown trigger's first tap keeps it open, and
    // the second, which follows the link, closes it.
    vi.spyOn(window, "matchMedia").mockImplementation(
      (q) => ({ matches: q === "(hover: none)", media: q }) as MediaQueryList,
    );
    burger.click();
    await expect.element(nav).toHaveClass("open");
    const trigger = nav.querySelector(".dropdown-trigger") as HTMLElement;
    trigger.click();
    await expect.element(trigger.closest(".nav-item") as HTMLElement).toHaveClass("is-open");
    expect(nav.classList.contains("open")).toBe(true);
    trigger.click();
    await expect.element(nav).not.toHaveClass("open");
    expect(container.querySelector(".is-open")).toBeNull();

    // With a mouse, a trigger is a link, and closes the menu too.
    vi.restoreAllMocks();
    burger.click();
    await expect.element(nav).toHaveClass("open");
    trigger.click();
    await expect.element(nav).not.toHaveClass("open");
  });

  it("scrolls to a place on the home page every time, even when the URL already names it", async () => {
    // Next's Link does nothing for a URL it is already at; the home page's
    // in-page links are plain anchors, which the browser always follows.
    const { container } = await render(
      <>
        <Nav />
        <div style={{ height: 3000 }} />
        <div id="join" style={{ height: 100 }} />
      </>,
    );
    const join = container.querySelector('a.pill[href="#join"]') as HTMLElement;
    for (let i = 0; i < 2; i++) {
      window.scrollTo(0, 0);
      join.click();
      await expect.poll(() => window.scrollY).toBeGreaterThan(2000);
    }
    window.scrollTo(0, 0);
    history.replaceState(null, "", location.pathname);
  });

  it("opens dropdowns with a tap on touch screens, one at a time", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (q) => ({ matches: q === "(hover: none)", media: q }) as MediaQueryList,
    );
    const { container } = await render(<Nav />);
    const [about, groups] = [...container.querySelectorAll<HTMLElement>(".dropdown-trigger")];
    const item = (t: HTMLElement) => t.closest(".nav-item") as HTMLElement;
    const navigated = vi.fn();
    container.addEventListener("click", (e) => {
      if (!e.defaultPrevented) navigated();
      e.preventDefault();
    });

    about.click();
    await expect.element(item(about)).toHaveClass("is-open");
    expect(about.getAttribute("aria-expanded")).toBe("true");
    expect(navigated).not.toHaveBeenCalled();

    groups.click();
    await expect.element(item(groups)).toHaveClass("is-open");
    expect(item(about).classList.contains("is-open")).toBe(false);
    expect(about.getAttribute("aria-expanded")).toBe("false");

    // A second tap closes it, and lets the link through.
    groups.click();
    await expect.element(item(groups)).not.toHaveClass("is-open");
    expect(navigated).toHaveBeenCalledTimes(1);

    // A tap outside closes an open one; a tap inside a dropdown doesn't.
    about.click();
    await expect.element(item(about)).toHaveClass("is-open");
    (item(about).querySelector(".dropdown a") as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(item(about).classList.contains("is-open")).toBe(true);
    document.body.click();
    await expect.element(item(about)).not.toHaveClass("is-open");
  });

  it("leaves dropdown links to the mouse on hover screens", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((q) => ({ matches: false, media: q }) as MediaQueryList);
    const { container } = await render(<Nav />);
    const about = container.querySelector(".dropdown-trigger") as HTMLElement;
    let prevented = true;
    container.addEventListener("click", (e) => {
      prevented = e.defaultPrevented;
      e.preventDefault();
    });
    about.click();
    expect(prevented).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(about.closest(".nav-item")!.classList.contains("is-open")).toBe(false);
  });

  it("takes focus off a dropdown link once it's chosen, so its dropdown doesn't stay open on the new page", async () => {
    await page.viewport(1280, 800);
    const { container } = await render(<Nav />);
    container.addEventListener("click", (e) => e.preventDefault());
    // Opened by focus, so the link can take it.
    container.querySelector<HTMLElement>(".dropdown-trigger")!.focus();
    const link = container.querySelector<HTMLElement>(".dropdown a")!;
    await expect.element(link).toBeVisible();
    link.focus();
    expect(link.closest(".nav-item")!.matches(":focus-within")).toBe(true);
    link.click();
    expect(document.activeElement).not.toBe(link);
    expect(link.closest(".nav-item")!.matches(":focus-within")).toBe(false);
  });

  it("closes the menu and dropdowns on a new page", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((q) => ({ matches: true, media: q }) as MediaQueryList);
    const { container, rerender } = await render(<Nav />);
    container.addEventListener("click", (e) => e.preventDefault());
    (container.querySelector(".burger") as HTMLElement).click();
    (container.querySelector(".dropdown-trigger") as HTMLElement).click();
    await expect.element(container.querySelector<HTMLElement>(".nav-item")!).toHaveClass("is-open");
    expect(container.querySelector("nav")!.classList.contains("open")).toBe(true);

    navigation.pathname = "/people";
    await rerender(<Nav />);
    expect(container.querySelector("nav")!.classList.contains("open")).toBe(false);
    expect(container.querySelector(".is-open")).toBeNull();

    // A tap on the new page acts on the new page's closed menu.
    (container.querySelector(".burger") as HTMLElement).click();
    await expect.element(container.querySelector("nav")!).toHaveClass("open");
    expect(container.querySelector(".is-open")).toBeNull();
  });

  it("stops listening for taps outside when it goes", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((q) => ({ matches: true, media: q }) as MediaQueryList);
    const { container, unmount } = await render(<Nav />);
    container.addEventListener("click", (e) => e.preventDefault());
    (container.querySelector(".dropdown-trigger") as HTMLElement).click();
    await expect.element(container.querySelector<HTMLElement>(".nav-item")!).toHaveClass("is-open");
    await unmount();
    // A listener left behind would look for the dropdowns, which are gone, and throw.
    document.body.click();
  });
});

describe("cookieDomains", () => {
  it("lists the host and each parent domain", () => {
    expect(cookieDomains("www.pauseai.uk")).toEqual(["www.pauseai.uk", ".www.pauseai.uk", ".pauseai.uk"]);
    expect(cookieDomains("localhost")).toEqual(["localhost"]);
  });
});

describe("CookieConsent", () => {
  const CONSENT = "pauseai-cookie-consent";
  let scripts: string[];

  beforeEach(() => {
    localStorage.clear();
    delete w.__gaLoaded;
    delete w.__gtmLoaded;
    delete w.dataLayer;
    delete w.gtag;
    scripts = [];
    // Record the analytics scripts instead of loading them.
    vi.spyOn(HTMLScriptElement.prototype, "src", "set").mockImplementation((v) => scripts.push(v));
  });

  function Page({ analytics = true }: { analytics?: boolean }) {
    return (
      <CookieConsent analytics={analytics}>
        <CookieSettingsLink />
      </CookieConsent>
    );
  }

  it("loads Tag Manager and analytics by default, once each, with no banner", async () => {
    const { unmount } = await render(<Page />);
    expect(scripts).toEqual([expect.stringContaining("gtm.js?id=GTM-"), expect.stringContaining("gtag/js?id=G-")]);
    expect(document.querySelector(".cookie-banner")).toBeNull();
    // gtag queues Arguments objects, which is what gtag.js reads.
    expect(Object.prototype.toString.call(w.dataLayer![1])).toBe("[object Arguments]");
    await unmount();
    await render(<Page />);
    expect(scripts).toHaveLength(2);
  });

  it("opens the banner from the footer link, once, and accepting keeps analytics on", async () => {
    await render(<Page />);
    await page.getByRole("link", { name: "Cookie settings" }).click();
    await page.getByRole("link", { name: "Cookie settings" }).click();
    expect(document.querySelectorAll(".cookie-banner")).toHaveLength(1);
    await expect.element(page.getByRole("dialog", { name: "Cookie consent" })).toBeVisible();
    await page.getByRole("button", { name: "Accept" }).click();
    expect(localStorage.getItem(CONSENT)).toBe("accepted");
    expect(document.querySelector(".cookie-banner")).toBeNull();
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-DLLRWZCYD7"]).toBe(false);
  });

  it("declining turns analytics off, clears its cookies and is remembered", async () => {
    document.cookie = "_ga=GA1.1.1; path=/";
    document.cookie = "_gid=GA1.1.2; path=/";
    document.cookie = "other=keep; path=/";
    await render(<Page />);
    await page.getByRole("link", { name: "Cookie settings" }).click();
    await page.getByRole("button", { name: "Decline" }).click();
    expect(localStorage.getItem(CONSENT)).toBe("declined");
    expect(document.cookie).not.toMatch(/_ga=|_gid=/);
    expect(document.cookie).toContain("other=keep");
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-DLLRWZCYD7"]).toBe(true);
  });

  it("keeps analytics off for someone who declined before", async () => {
    localStorage.setItem(CONSENT, "declined");
    await render(<Page />);
    expect(scripts).toEqual([]);
  });

  it("does nothing in a build without analytics, whatever was chosen before", async () => {
    localStorage.setItem(CONSENT, "accepted");
    await render(<Page analytics={false} />);
    expect(scripts).toEqual([]);
    await page.getByRole("link", { name: "Cookie settings" }).click();
    expect(document.querySelector(".cookie-banner")).toBeNull();
  });

  it("does nothing on a page that opts out of analytics", async () => {
    document.body.setAttribute("data-no-analytics", "");
    await render(<Page />);
    expect(scripts).toEqual([]);
    await page.getByRole("link", { name: "Cookie settings" }).click();
    expect(document.querySelector(".cookie-banner")).toBeNull();
  });

  it("still works when the browser blocks storage", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("blocked");
      },
      setItem: () => {
        throw new DOMException("blocked");
      },
    });
    await render(<Page />);
    expect(scripts).toHaveLength(2);
    await page.getByRole("link", { name: "Cookie settings" }).click();
    await page.getByRole("button", { name: "Decline" }).click();
    expect(document.querySelector(".cookie-banner")).toBeNull();
  });

  it("uses an existing dataLayer", async () => {
    w.dataLayer = ["existing"];
    await render(<Page />);
    expect(w.dataLayer[0]).toBe("existing");
  });

  it("opens from the footer's link", async () => {
    await render(
      <CookieConsent analytics>
        <Footer />
      </CookieConsent>,
    );
    await page.getByRole("link", { name: "Cookie settings" }).click();
    await expect.element(page.getByRole("dialog", { name: "Cookie consent" })).toBeVisible();
  });
});
