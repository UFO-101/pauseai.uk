"use client";

import { useEffect } from "react";

// The only origin allowed to drive the embed's height. Without this check any
// page framing us — or any window we opened — could post a resize and hide the
// campaign form. Matches EMBED_ORIGIN in app/OnboardingFormEmbed.tsx.
const EMBED_ORIGIN = "https://pauseai.info";

export default function CampaignsClient() {
  useEffect(() => {
    const iframe = document.getElementById("campaigns-embed") as HTMLIFrameElement | null;
    if (iframe) {
      const handleMessage = (e: MessageEvent) => {
        if (e.origin !== EMBED_ORIGIN) return;
        const data = e.data;
        if (!data || typeof data !== "object") return;
        if (data.type !== "pauseai-embed-resize") return;
        if (typeof data.height !== "number" || !isFinite(data.height)) return;
        iframe.style.height = data.height + "px";
      };
      window.addEventListener("message", handleMessage);
    }

    const trigger = document.querySelector(".qr-thumb") as HTMLElement | null;
    const lb = document.getElementById("qr-lightbox") as HTMLElement | null;
    if (trigger && lb) {
      const closeBtn = lb.querySelector(".qr-lightbox-close") as HTMLElement | null;
      const open = () => { lb.classList.add("open"); lb.setAttribute("aria-hidden", "false"); };
      const close = () => { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); };
      trigger.addEventListener("click", open);
      closeBtn?.addEventListener("click", close);
      lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape" && lb.classList.contains("open")) close();
      };
      document.addEventListener("keydown", handleKey);
      return () => {
        document.removeEventListener("keydown", handleKey);
      };
    }
  }, []);

  return null;
}
