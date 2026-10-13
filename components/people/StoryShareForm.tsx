"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    Tally?: { loadEmbeds: () => void };
  }
}

export default function StoryShareForm() {
  useEffect(() => {
    // If the Tally script is already loaded and cached (e.g. this page was
    // reached via client-side navigation rather than a full page load),
    // Script's onLoad below won't fire again — re-scan for the embed here.
    window.Tally?.loadEmbeds();
  }, []);

  return (
    <>
      <Script
        src="https://tally.so/widgets/embed.js"
        strategy="afterInteractive"
        onLoad={() => window.Tally?.loadEmbeds()}
      />
      <div className="story-share-form">
        <iframe
          data-tally-src="https://tally.so/embed/J9k5NY?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
          loading="lazy"
          width="100%"
          height={2725}
          frameBorder={0}
          marginHeight={0}
          marginWidth={0}
          title="Share your story"
        />
      </div>
    </>
  );
}
