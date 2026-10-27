import type { Permission } from "./staff-permissions";

// The staff interface's pages, in sections, for the navigation. A page with
// a permission shows only to those who have it, and requires it
// (requireStaff(permission)), as do the pages under it: a supporter's page
// is under Supporters, a letter's under Letters. A section shows the pages
// you can open, and hides when there are none.
// tests/checks/staff-auth.test.ts checks every page asks for what its place
// here says.

export type StaffPageId =
  | "supporters"
  | "letters"
  | "supporterEmails"
  | "politicians"
  | "asks"
  | "mpEmails"
  | "import"
  | "accounts"
  | "changes";
export type StaffSectionId = "supporters" | "politicians" | "admin";

export type StaffPageLink = { id: StaffPageId; href: string; permission?: Permission };

export type StaffSection = { id: StaffSectionId; pages: StaffPageLink[] };

const STAFF_SECTIONS: readonly StaffSection[] = [
  {
    id: "supporters",
    pages: [
      { id: "supporters", href: "/staff/supporters", permission: "supporters" },
      { id: "letters", href: "/staff/letters", permission: "supporters" },
      { id: "supporterEmails", href: "/staff/supporters/blocked-emails", permission: "supporters" },
    ],
  },
  {
    id: "politicians",
    pages: [
      { id: "politicians", href: "/staff/politicians" },
      { id: "asks", href: "/staff/asks" },
      { id: "mpEmails", href: "/staff/politicians/blocked-emails" },
    ],
  },
  {
    id: "admin",
    pages: [
      { id: "import", href: "/staff/import-data" },
      { id: "accounts", href: "/staff/accounts", permission: "admin" },
      { id: "changes", href: "/staff/audit-log", permission: "admin" },
    ],
  },
];

/** The sections a staff member with `permissions` sees, each with only the pages they can open. */
export function sectionsFor(permissions: readonly Permission[]): StaffSection[] {
  return STAFF_SECTIONS.map((section) => ({
    ...section,
    pages: section.pages.filter((page) => !page.permission || permissions.includes(page.permission)),
  })).filter((section) => section.pages.length > 0);
}

/**
 * The page in the navigation a path is, or is under: the one whose href
 * is the longest whole-segment prefix of it. So /staff/supporters/7 is
 * under Supporters, and /staff/supporters/blocked-emails is its own page.
 */
export function staffPageOf(path: string): StaffPageLink | undefined {
  return STAFF_SECTIONS.flatMap((section) => section.pages)
    .filter((page) => path === page.href || path.startsWith(`${page.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
