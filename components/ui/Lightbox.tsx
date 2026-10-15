"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A full-screen overlay for a photo or QR code. It renders nothing while
 * closed, and at the end of <body> while open, so nothing on the page can
 * stack above it. Escape, or a click on the backdrop, closes it; the arrow
 * keys call `onPrevious` and `onNext`, if given. The caller brings the
 * contents, its own close button among them, and the styles, which show it
 * with an `open` class.
 */
export default function Lightbox({
  open,
  onClose,
  onPrevious,
  onNext,
  className,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  className: string;
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
      className={`${className} open`}
      role="dialog"
      aria-label={label}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
