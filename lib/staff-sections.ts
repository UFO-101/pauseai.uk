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
  | "mailings"
  | "mpEmails"
  | "import"
  | "accounts"
  | "changes";
export type StaffSectionId = "supporters" | "politicians" | "admin";

/**
 * A page in the navigation: which, where, and the permission it needs. The
 * paths `under` it too, besides its own: pages that belong with it but live
 * elsewhere.
 */
export type StaffPageLink = { id: StaffPageId; href: string; permission?: Permission; under?: string[] };

export type StaffSection = { id: StaffSectionId; pages: StaffPageLink[] };

const STAFF_SECTIONS: readonly StaffSection[] = [
  {
    id: "supporters",
    pages: [
      // A supporter's letters are a page of the supporter's.
      { id: "supporters", href: "/staff/supporters", permission: "supporters", under: ["/staff/letters/supporter"] },
      { id: "letters", href: "/staff/letters", permission: "supporters" },
      { id: "supporterEmails", href: "/staff/supporters/blocked-emails", permission: "supporters" },
    ],
  },
  {
    id: "politicians",
    pages: [
      { id: "politicians", href: "/staff/politicians" },
      { id: "asks", href: "/staff/asks" },
      { id: "mailings", href: "/staff/mailings" },
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
 * The page in the navigation a path is, or is under: the one with the
 * longest whole-segment prefix of it, its href or one it has `under` it. So
 * /staff/supporters/7 is under Supporters, /staff/supporters/blocked-emails
 * is its own page, and /staff/letters/supporter/7 is under Supporters too.
 */
export function staffPageOf(path: string): StaffPageLink | undefined {
  const within = (prefix: string) => (path === prefix || path.startsWith(`${prefix}/`) ? prefix.length : 0);
  return STAFF_SECTIONS.flatMap((section) => section.pages)
    .map((page) => ({ page, length: Math.max(...[page.href, ...(page.under ?? [])].map(within)) }))
    .filter(({ length }) => length > 0)
    .sort((a, b) => b.length - a.length)[0]?.page;
}
