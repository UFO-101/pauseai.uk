import type { ReactNode } from "react";
import type { StaffPageId } from "@/lib/staff-sections";

/** An envelope, crossed out. */
const BLOCKED = (
  <>
    <path d="M20 12V6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8" />
    <path d="M4 6l8 6 8-6M16 16l5 5M21 16l-5 5" />
  </>
);

/**
 * Each staff page's icon, drawn in strokes of the text's colour, a 24-unit
 * square: what the sidebar shows when it's folded, beside the name when it
 * isn't. The two blocked-email pages share one, as they're one thing for
 * two kinds of people.
 */
const PATHS: Record<StaffPageId | "home" | "me" | "logout", ReactNode> = {
  // A house.
  home: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" />,
  // Two people.
  supporters: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.7-3.6 3.3-5.5 6.5-5.5s5.8 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.7 3.1 2.4 3.5 5.2" />
    </>
  ),
  // A pen writing on a page.
  letters: (
    <>
      <path d="M13 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
      <path d="M17.5 3.5l3 3L13 14l-3.5.5.5-3.5z" />
    </>
  ),
  supporterEmails: BLOCKED,
  // A building with columns.
  politicians: <path d="M3 9.5L12 4l9 5.5M4 20h16M6 10v8M10 10v8M14 10v8M18 10v8" />,
  // A clipboard with a tick.
  asks: (
    <>
      <path d="M9 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3" />
      <rect x="9" y="3" width="6" height="3" rx="1" />
      <path d="M9 13.5l2 2 4-4.5" />
    </>
  ),
  // A paper plane.
  mailings: <path d="M21 3L3 10.5l7 2.5M21 3l-6.5 18-4.5-8M21 3L10 13" />,
  mpEmails: BLOCKED,
  // Arrows going round.
  import: (
    <>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />
    </>
  ),
  // A key.
  accounts: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2L20 3M16 7l3 3M18 5l2 2" />
    </>
  ),
  // A clock with an arrow round it.
  changes: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 4v4.5H8" />
      <path d="M12 8v4.5l3 2" />
    </>
  ),
  // An @, for your own page, by your address.
  me: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.3 6.7" />
    </>
  ),
  // A door, and an arrow going out of it.
  logout: <path d="M14 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8M10 12h11M17 8l4 4-4 4" />,
};

/** A staff page's icon, your own page's or Log out's, for beside its name; hidden from screen readers, which read the name. */
export default function NavIcon({ id }: { id: keyof typeof PATHS }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}
