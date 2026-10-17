"use client";

import { useRef, useState } from "react";
import { site } from "@/lib/content/site";
import { displayLink } from "@/lib/collateral/qrCaption";
import styles from "./FooterQr.module.css";

/** The footer's QR code icon, which opens a big QR code for this page, in the QR generator's style. */
export default function FooterQr() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [qr, setQr] = useState<{ src: string; link: string } | null>(null);

  async function open() {
    // Loaded on first tap, so every page doesn't carry the QR library.
    const { qrShape, qrSvg } = await import("@/lib/collateral/qrShape");
    // The live address, without any query, so the code is the same wherever the page is opened.
    const url = site.url + window.location.pathname;
    const svg = qrSvg(qrShape(url, 1000, true), { background: "#FFFFFF", roundedPanel: false });
    setQr({ src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, link: displayLink(url) });
    // showModal gives the focus trap, Escape to close and the backdrop.
    dialogRef.current!.showModal();
  }

  const close = () => dialogRef.current!.close();

  return (
    <>
      <button type="button" className={styles.button} aria-label="Show QR code larger" onClick={open}>
        {/* A QR code (Lucide's, ISC licence). */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable={false}
        >
          <rect width="5" height="5" x="3" y="3" rx="1" />
          <rect width="5" height="5" x="16" y="3" rx="1" />
          <rect width="5" height="5" x="3" y="16" rx="1" />
          <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
          <path d="M21 21v.01" />
          <path d="M12 7v3a2 2 0 0 1-2 2H7" />
          <path d="M3 12h.01" />
          <path d="M12 3h.01" />
          <path d="M12 16v.01" />
          <path d="M16 12h1" />
          <path d="M21 12v.01" />
          <path d="M12 21v-1" />
        </svg>
      </button>
      {/* A tap on the backdrop is a tap on the dialog itself, and closes it. */}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label="QR code"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className={styles.card}>
          {qr && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL, not a file next/image can optimise */}
              <img src={qr.src} alt="QR code linking to this page" />
              <p>
                Scan to share this page
                <strong>{qr.link}</strong>
              </p>
            </>
          )}
        </div>
        <button type="button" className={styles.close} aria-label="Close" onClick={close}>
          &times;
        </button>
      </dialog>
    </>
  );
}
