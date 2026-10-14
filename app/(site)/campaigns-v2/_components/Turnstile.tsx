"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/content/email-your-mp";

// Cloudflare Turnstile's widget. The server checks the token it produces
// (lib/server/turnstile.ts). Tokens are single use, so the form remounts
// this after each submission.

export type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileApi; onTurnstileLoad?: () => void };

export const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";

// The script while it loads. Once it has, window.turnstile is there instead;
// if it failed, the next widget tries again.
let loading: Promise<TurnstileApi> | undefined;

/** Loads Turnstile's script once per page, however many widgets mount. */
export function loadTurnstile(): Promise<TurnstileApi> {
  const w = window as TurnstileWindow;
  if (w.turnstile) return Promise.resolve(w.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    w.onTurnstileLoad = () => {
      loading = undefined;
      if (w.turnstile) resolve(w.turnstile);
      else reject(new Error("Turnstile loaded without its API"));
    };
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.append(script);
  });
  return loading;
}

export default function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // The latest callback, so a new function each render doesn't remount the widget.
  const tokenCallback = useRef(onToken);
  useEffect(() => {
    tokenCallback.current = onToken;
  });

  useEffect(() => {
    let cancelled = false;
    let api: TurnstileApi | undefined;
    let widgetId: string | undefined;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) return;
        api = turnstile;
        widgetId = turnstile.render(container.current!, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token: string) => {
            setFailed(false);
            tokenCallback.current(token);
          },
          "error-callback": () => {
            setFailed(true);
            tokenCallback.current("");
          },
          "expired-callback": () => tokenCallback.current(""),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (api && widgetId) api.remove(widgetId);
    };
  }, [siteKey]);

  return (
    <div data-turnstile>
      <div ref={container} />
      {failed && <p role="alert">{copy.errors.turnstileLoad}</p>}
    </div>
  );
}
