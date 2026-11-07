import type { ReactNode } from "react";
import type { AskKind } from "@/lib/asks";

const PATHS: Record<AskKind, ReactNode> = {
  // A pen on a page.
  letter: (
    <>
      <path d="M13 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
      <path d="M17.5 3.5l3 3L13 14l-3.5.5.5-3.5z" />
    </>
  ),
  // A calendar.
  event: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="1" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
};

/** An ask's kind as a picture, in strokes of the text's colour; hidden from screen readers, which have its words. */
export default function AskKindIcon({ kind, size = 28 }: { kind: AskKind; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {PATHS[kind]}
    </svg>
  );
}
