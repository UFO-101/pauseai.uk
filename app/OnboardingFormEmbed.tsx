"use client";

import { useEffect, useRef, useState } from "react";

const EMBED_ORIGIN = "https://pauseai.info";
// referrerPolicy on the iframe (below) lets pauseai.info read the full host URL
// from document.referrer and self-attribute the signup to this page — no source
// param needed. See pauseai-website/docs/ONBOARDING_EMBED.md.
const EMBED_URL = `${EMBED_ORIGIN}/embed/onboarding-form/?country=United+Kingdom&bg=FDF8F3`;
const DEFAULT_HEIGHT = 871;
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

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== EMBED_ORIGIN) return;
      const data = event.data;
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

        setHeight((prev) => {
          if (settledRef.current && data.height < prev && iframeRef.current) {
            iframeRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          return data.height;
        });
      }
    }
    window.addEventListener("message", handleMessage);

    const timeoutId = setTimeout(() => {
      if (!messageReceivedRef.current) setShowFallback(true);
    }, LOAD_TIMEOUT_MS);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(settleTimerRef.current);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="onboarding-embed-wrap">
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
