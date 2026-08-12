"use client";

import { useState } from "react";

export default function CopyLinkButton({
  slug,
  className,
  size = 16,
  label,
}: {
  slug: string;
  className?: string;
  size?: number;
  // When set, renders as a labelled button (icon + text) instead of the
  // default icon-only circle.
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/people/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      className={[label ? "btn ghost story-share-cta" : "story-share-btn", className].filter(Boolean).join(" ")}
      onClick={handleCopy}
      aria-label={copied ? "Link copied" : "Copy link to this story"}
      title={copied ? "Link copied" : "Copy link to this story"}
    >
      {copied ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )}
      {label && <span>{copied ? "Copied!" : label}</span>}
    </button>
  );
}
