"use client";

import { useState } from "react";
import { buttonAttributes } from "./Button";

export default function CopyLinkButton({
  slug,
  href,
  title = "Copy link to this story",
  className,
  size = 16,
  label,
}: {
  // A person slug (links to /people/<slug>) or any site-relative href.
  slug?: string;
  href?: string;
  // Tooltip and accessible name while idle.
  title?: string;
  className?: string;
  size?: number;
  // When set, renders as a labelled button (icon + text) instead of the
  // default icon-only circle.
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}${href ?? `/people/${slug}`}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Labelled, it is an ordinary ghost button; otherwise an icon-only circle.
  const look = label
    ? buttonAttributes({ variant: "ghost", className: ["story-share-cta", className].filter(Boolean).join(" ") })
    : { className: ["story-share-btn", className].filter(Boolean).join(" ") };

  return (
    <button
      type="button"
      {...look}
      onClick={handleCopy}
      aria-label={copied ? "Link copied" : title}
      title={copied ? "Link copied" : title}
    >
      {copied ? (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )}
      {label && <span>{copied ? "Copied!" : label}</span>}
    </button>
  );
}
