"use client";

import { useEffect, useState } from "react";

// The only origin allowed to drive the embed's height. Without this check any
// page framing us — or any window we opened — could post a resize and hide the
// campaign form. Matches EMBED_ORIGIN in app/(site)/_components/OnboardingFormEmbed.tsx.
const EMBED_ORIGIN = "https://pauseai.info";

// The email-your-MP form, embedded from pauseai.info.
export default function EmailYourMp() {
  // Set by the embed, which reports its own height as it changes.
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== EMBED_ORIGIN) return;
      const data = e.data;
      if (!data || typeof data !== "object") return;
      // Fired once per MP email sent by the embed (no personal data). GTM
      // listens for this custom event to fire the Google Ads conversion tag.
      if (data.event === "mp_email_sent") {
        const w = window as typeof window & { dataLayer?: unknown[] };
        w.dataLayer = w.dataLayer || [];
        w.dataLayer.push({ event: "mp_email_sent" });
        return;
      }
      if (data.type !== "pauseai-embed-resize") return;
      if (typeof data.height !== "number" || !isFinite(data.height)) return;
      setHeight(data.height);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <section id="email-your-mp" className="campaigns-embed">
      <div className="container">
        <h2>Email your MP</h2>
        <div className="embed-frame">
          <iframe
            id="campaigns-embed"
            src="https://pauseai.info/embed/uk-email-mp"
            title="Email your MP — PauseAI"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={height === undefined ? undefined : { height }}
          ></iframe>
        </div>
        <p className="embed-fallback">
          Having trouble loading the form?{" "}
          <a href="https://pauseai.info/uk-email-mp" target="_blank" rel="noreferrer">
            Open it on pauseai.info &rarr;
          </a>
        </p>
      </div>
    </section>
  );
}
