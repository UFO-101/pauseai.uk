import type { Permission } from "./staff-permissions";

// The staff interface's pages, in groups, for the home page and the
// navigation. A group with a permission shows only to those who have it;
// its pages require it (requireStaff(permission)).

export type StaffPageId =
  "supporters" | "politicians" | "letters" | "emails" | "import" | "history" | "permissions" | "changes";
export type StaffSectionId = "supporters" | "politicians" | "letters" | "email" | "data" | "admin";

export type StaffSection = {
  id: StaffSectionId;
  permission?: Permission;
  pages: { id: StaffPageId; href: string }[];
};

export const STAFF_SECTIONS: readonly StaffSection[] = [
  { id: "supporters", permission: "supporters", pages: [{ id: "supporters", href: "/staff/supporters" }] },
  { id: "politicians", pages: [{ id: "politicians", href: "/staff/politicians" }] },
  { id: "letters", pages: [{ id: "letters", href: "/staff/letters" }] },
  { id: "email", pages: [{ id: "emails", href: "/staff/blocked-emails" }] },
  {
    id: "data",
    pages: [
      { id: "import", href: "/staff/import-data" },
      { id: "history", href: "/staff/import-history" },
    ],
  },
  {
    id: "admin",
    permission: "admin",
    pages: [
      { id: "permissions", href: "/staff/permissions" },
      { id: "changes", href: "/staff/audit-log" },
    ],
  },
];

/** The groups a staff member with `permissions` sees. */
export function sectionsFor(permissions: readonly Permission[]): StaffSection[] {
  return STAFF_SECTIONS.filter((section) => !section.permission || permissions.includes(section.permission));
}
