import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, it } from "vitest";

// A staff page's widths come from its grid (ui/Grid) and the measure
// (--staff-measure, ui/StaffPage), never from a component choosing its own
// (docs/style-guide.md, "Staff pages"). This fails on a max-width in a
// staff component's stylesheet that isn't the measure or 100%, outside the
// layout pieces in ui/ and the few below, which aren't part of a page's
// layout. A new one isn't added here without a reason.
const ROOT = join(__dirname, "..", "..");
const COMPONENTS = join(ROOT, "app", "(staff)", "staff", "_components");

/** Rules whose width isn't the page's to set, by file and selector, and why. */
const ALLOWED: Record<string, string> = {
  // Over the page, where the grid doesn't reach.
  "ChangesTable.module.css .json": "a popover",
  "PermissionTiles.module.css .popover": "a popover",
  "Details.module.css .editPopover": "a popover",
  "DeletePolitician.module.css .confirm": "a popover",
  "MailingView.module.css .popover": "a popover",
  "MailingEditor.module.css .partMenu": "a popover",
  "MailingWriter.module.css .helpBox": "a popover",
  "MailingWriter.module.css .ask": "a field",
  "MailingWriter.module.css .sender": "a field",
  "MailingWriter.module.css .day": "a field",
  "MailingWriter.module.css .hour": "a field",
  "MailingWriter.module.css .whoShown": "a field",
  "StaffNav.module.css .menu > div": "the menu's dropdown",
  // The login page: one card in the middle of the window, with no grid.
  "LoginCard.module.css .login": "the login page",
  "DevLogin.module.css .dev": "the login page",
  // A control's width inside a form.
  "StaffForms.module.css .narrow": "a field",
  "FilterBar.module.css .search > :first-child": "the search, so its label fits",
  "Menu.module.css .menu": "a popover",
  "StaffAccountsTable.module.css .add input": "a field",
};

/** Each rule's selector and its max-width, from a stylesheet's text, at-rules' own selectors left out. */
function maxWidths(css: string): { selector: string; value: string }[] {
  const found: { selector: string; value: string }[] = [];
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const width = match[2].match(/(?:^|;)\s*max-width:\s*([^;]+)/);
    if (width) found.push({ selector: match[1].trim(), value: width[1].trim() });
  }
  return found;
}

it("no staff component sets its own width, but for the measure", () => {
  const files = readdirSync(COMPONENTS).filter((name) => name.endsWith(".module.css"));
  expect(files.length).toBeGreaterThan(10);
  const own = files.flatMap((name) =>
    maxWidths(readFileSync(join(COMPONENTS, name), "utf8"))
      .filter(({ value }) => value !== "var(--staff-measure)" && value !== "100%")
      .map(({ selector, value }) => `${name} ${selector}: ${value}`)
      .filter((rule) => !Object.keys(ALLOWED).some((allowed) => rule.startsWith(`${allowed}:`))),
  );
  expect(own, `widths set by components in ${relative(ROOT, COMPONENTS)}`).toEqual([]);
});

it("finds a max-width in a rule, inside an at-rule too, and leaves out comments", () => {
  expect(
    maxWidths(`/* max-width: 1px */ .a { color: red; max-width: 3rem; } @media (x) { .b { max-width: 1px } }`),
  ).toEqual([
    { selector: ".a", value: "3rem" },
    { selector: ".b", value: "1px" },
  ]);
});
