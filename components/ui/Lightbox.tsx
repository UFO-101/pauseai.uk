"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import IconButton from "./IconButton";
import styles from "./Lightbox.module.css";

/**
 * A full-screen overlay for a photo, on a dark backdrop, with a close button
 * and, if `onPrevious` and `onNext` are given, buttons to step through. It
 * renders nothing while closed, and at the end of <body> while open, so
 * nothing on the page can stack above it. Escape, the close button or a
 * click on the backdrop closes it; the arrow keys step. The caller brings
 * the photo.
 */
export default function Lightbox({
  open,
  onClose,
  onPrevious,
  onNext,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  label?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrevious?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, onPrevious, onNext]);

  if (!open) return null;
  return createPortal(
    <div
      className={styles.lightbox}
      role="dialog"
      aria-label={label}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <IconButton look="dark" className={styles.close} aria-label="Close" onClick={onClose}>
        <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </IconButton>
      {onPrevious && (
        <IconButton look="dark" className={styles.previous} aria-label="Previous" onClick={onPrevious}>
          <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
      )}
      {onNext && (
        <IconButton look="dark" className={styles.next} aria-label="Next" onClick={onNext}>
          <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
            <path
              d="M9 5l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
      )}
      {children}
    </div>,
    document.body,
  );
}
