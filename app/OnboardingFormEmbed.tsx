"use client";

import { useEffect, useRef, useState } from "react";

const EMBED_ORIGIN = "https://pauseai.info";
const EMBED_URL = `${EMBED_ORIGIN}/embed/onboarding-form/?country=United+Kingdom&bg=FDF8F3`;
const DEFAULT_HEIGHT = 600;

export default function OnboardingFormEmbed() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== EMBED_ORIGIN) return;
      const data = event.data;
      if (typeof data?.height === "number") {
        setHeight((prev) => {
          if (data.height < prev && iframeRef.current) {
            iframeRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          return data.height;
        });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={EMBED_URL}
      loading="lazy"
      width="100%"
      height={height}
      frameBorder={0}
      marginHeight={0}
      marginWidth={0}
      title="Get involved!"
      style={{ transition: "height 0.2s ease" }}
    />
  );
}
