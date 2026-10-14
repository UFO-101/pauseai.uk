import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { copy } from "@/lib/content/email-your-mp";
import Turnstile, { loadTurnstile, TURNSTILE_SCRIPT, type TurnstileApi } from "./Turnstile";

type TurnstileWindow = Window & { turnstile?: TurnstileApi; onTurnstileLoad?: () => void };
const w = window as TurnstileWindow;

/** A stand-in for Cloudflare's API that keeps the options the widget was drawn with. */
function fakeTurnstile() {
  const api = {
    options: {} as Record<string, (token?: string) => void>,
    render: vi.fn((_el: HTMLElement, options: Record<string, unknown>) => {
      api.options = options as typeof api.options;
      return "widget-1";
    }),
    remove: vi.fn(),
  };
  return api;
}

/** Catches the script tag instead of loading Cloudflare's real script. */
function catchScript() {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "append").mockImplementation((node) => void scripts.push(node as HTMLScriptElement));
  return scripts;
}

beforeEach(() => {
  delete w.turnstile;
  delete w.onTurnstileLoad;
});
afterEach(() => vi.restoreAllMocks());

describe("Turnstile", () => {
  it("draws the widget, and passes on tokens, expiries and errors", async () => {
    const api = fakeTurnstile();
    w.turnstile = api;
    const onToken = vi.fn();
    const { unmount } = await render(<Turnstile siteKey="site-key" onToken={onToken} />);

    await vi.waitFor(() => expect(api.render).toHaveBeenCalled());
    expect(api.render.mock.calls[0][1]).toMatchObject({ sitekey: "site-key" });
    api.options.callback("token-1");
    expect(onToken).toHaveBeenLastCalledWith("token-1");
    api.options["expired-callback"]();
    expect(onToken).toHaveBeenLastCalledWith("");
    api.options["error-callback"]();
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.errors.turnstileLoad);
    api.options.callback("token-2");
    await expect.element(page.getByRole("alert")).not.toBeInTheDocument();

    await unmount();
    expect(api.remove).toHaveBeenCalledWith("widget-1");
  });

  it("loads Cloudflare's script once, and says so if it fails", async () => {
    const scripts = catchScript();
    await render(<Turnstile siteKey="k" onToken={() => {}} />);
    await vi.waitFor(() => expect(scripts).toHaveLength(1));
    expect(scripts[0].src).toBe(TURNSTILE_SCRIPT);

    scripts[0].onerror!(new Event("error"));
    await expect.element(page.getByRole("alert")).toHaveTextContent(copy.errors.turnstileLoad);
  });

  it("resolves when the script has loaded, and rejects if it brought no API", async () => {
    const scripts = catchScript();
    const first = loadTurnstile();
    expect(loadTurnstile()).toBe(first);
    w.onTurnstileLoad!();
    await expect(first).rejects.toThrow("without its API");

    // A failed load can be tried again.
    const second = loadTurnstile();
    const api = fakeTurnstile();
    w.turnstile = api;
    w.onTurnstileLoad!();
    await expect(second).resolves.toBe(api);
    expect(scripts).toHaveLength(2);
  });

  it("does nothing once unmounted, whether the script loads or fails", async () => {
    const scripts = catchScript();
    const api = fakeTurnstile();
    const first = await render(<Turnstile siteKey="k" onToken={() => {}} />);
    await vi.waitFor(() => expect(scripts).toHaveLength(1));
    await first.unmount();
    w.turnstile = api;
    w.onTurnstileLoad!();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(api.render).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();

    delete w.turnstile;
    scripts[0].onerror!(new Event("error"));
    const second = await render(<Turnstile siteKey="k" onToken={() => {}} />);
    await vi.waitFor(() => expect(scripts).toHaveLength(2));
    await second.unmount();
    scripts[1].onerror!(new Event("error"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector("[role=alert]")).toBeNull();
  });
});
