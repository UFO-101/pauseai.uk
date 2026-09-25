"use client";

import { useEffect, useRef, useState } from "react";

const EMBED_ORIGIN = "https://pauseai.info";
// referrerPolicy on the iframe (below) lets pauseai.info read the full host URL
// from document.referrer and self-attribute the signup to this page — no source
// param needed. See pauseai-website/docs/ONBOARDING_EMBED.md.
const EMBED_URL = `${EMBED_ORIGIN}/embed/onboarding-form/?country=United+Kingdom&bg=FDF8F3`;
// The first step's height as the embed reports it at desktop and tablet widths
// (checked September 2026). Reserving it up front stops the page growing under
// a reader who deep-linked further down, e.g. /#staff, mid-scroll. Phones need
// a little more; see .onboarding-embed-wrap.is-loading in globals.css. If the
// form's first step changes height, update both.
const DEFAULT_HEIGHT = 1146;
const SETTLE_DELAY_MS = 400;
const LOAD_TIMEOUT_MS = 8000;

export default function OnboardingFormEmbed() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [messageReceived, setMessageReceived] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const settledRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Read via ref inside the timeout below so it sees the latest value
  // without re-registering the message listener on every height update.
  const messageReceivedRef = useRef(false);
  const heightRef = useRef(DEFAULT_HEIGHT);
  // Set once the user has clicked or tabbed into the form. Clicks inside a
  // cross-origin iframe don't reach this page; the page just loses focus to
  // the iframe, so that blur is the signal.
  const interactedRef = useRef(false);

  useEffect(() => {
    function handleBlur() {
      if (document.activeElement === iframeRef.current) interactedRef.current = true;
    }

    function handleMessage(event: MessageEvent) {
      if (event.origin !== EMBED_ORIGIN) return;
      const data = event.data;
      // Fired once per new signup by the embed (no personal data). GTM listens
      // for this custom event to fire the Google Ads conversion tag.
      if (data?.event === "onboarding_signup_complete") {
        const w = window as typeof window & { dataLayer?: unknown[] };
        w.dataLayer = w.dataLayer || [];
        w.dataLayer.push({ event: "onboarding_signup_complete" });
        return;
      }
      if (typeof data?.height === "number") {
        messageReceivedRef.current = true;
        setMessageReceived(true);
        // The embed reports height in a burst while it settles on load (fonts,
        // layout, etc.) before any user interaction. Only treat a height
        // decrease as a real step-advance once those messages have gone quiet.
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = setTimeout(() => {
          settledRef.current = true;
        }, SETTLE_DELAY_MS);

        // A shorter step can leave the user looking at the space below the
        // form, so bring its top back into view. Only after they've used the
        // form: a reflow on its own (a font arriving late, the iOS toolbar
        // resizing the viewport) also shrinks it, and used to pull the page
        // away from wherever the reader was.
        const iframe = iframeRef.current;
        if (
          iframe &&
          settledRef.current &&
          interactedRef.current &&
          data.height < heightRef.current &&
          iframe.getBoundingClientRect().top < 0
        ) {
          // No behavior option, so it follows the stylesheet's
          // scroll-behavior and stays instant under reduced motion.
          iframe.scrollIntoView({ block: "start" });
        }
        heightRef.current = data.height;
        setHeight(data.height);
      }
    }
    window.addEventListener("message", handleMessage);
    window.addEventListener("blur", handleBlur);

    const timeoutId = setTimeout(() => {
      if (!messageReceivedRef.current) setShowFallback(true);
    }, LOAD_TIMEOUT_MS);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("blur", handleBlur);
      clearTimeout(settleTimerRef.current);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className={messageReceived ? "onboarding-embed-wrap" : "onboarding-embed-wrap is-loading"}>
      {!messageReceived && (
        <div className="onboarding-embed-skeleton" aria-hidden="true">
          <div className="onboarding-embed-skeleton-steps">
            <span className="onboarding-embed-skeleton-step" />
            <span className="onboarding-embed-skeleton-rule" />
            <span className="onboarding-embed-skeleton-step" />
            <span className="onboarding-embed-skeleton-rule" />
            <span className="onboarding-embed-skeleton-step" />
          </div>
          <div className="onboarding-embed-skeleton-card">
            {[0, 1, 2, 3].map((i) => (
              <div className="onboarding-embed-skeleton-field" key={i}>
                <span className="onboarding-embed-skeleton-label" />
                <span className="onboarding-embed-skeleton-input" />
              </div>
            ))}
            <span className="onboarding-embed-skeleton-button" />
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={EMBED_URL}
        referrerPolicy="no-referrer-when-downgrade"
        width="100%"
        height={height}
        frameBorder={0}
        marginHeight={0}
        marginWidth={0}
        title="Get involved!"
        onLoad={() => setIframeLoaded(true)}
        style={{ transition: "height 0.2s ease" }}
      />
      {showFallback && (
        <p className="onboarding-embed-fallback">
          {iframeLoaded ? "Form is taking a while to load." : "Form didn't load."}{" "}
          <a href={EMBED_URL} target="_blank" rel="noopener noreferrer">
            Open it in a new tab
          </a>
          .
        </p>
      )}
    </div>
  );
}
