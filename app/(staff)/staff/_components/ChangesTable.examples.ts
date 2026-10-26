import type { LoggedChange } from "@/lib/server/audit";

/** An entry, at a fixed time, about no one unless it says so. */
function change(
  id: number,
  actor: string,
  action: string,
  details: Record<string, unknown>,
  about: Partial<LoggedChange> = {},
): LoggedChange {
  const at = `2026-10-12T09:${String(60 - id).padStart(2, "0")}:00Z`;
  return { id, at, actor, action, details, politician: null, supporter: null, ...about };
}

const POLLY = { id: 7, name: "Polly Placeholder" };

/** One of each kind of entry the audit log holds, newest first, and some of kinds it doesn't know. */
export const exampleChanges: LoggedChange[] = [
  change(
    1,
    "jo@pauseai.uk",
    "set status",
    { politicianId: 7, campaign: "regulate-letter-pm", status: "signed", date: "2026-10-01", note: "By email" },
    { politician: POLLY },
  ),
  change(2, "controlai", "set status", {
    politicianId: 99,
    ask: "controlai-statement",
    status: null,
    date: null,
    note: "",
  }),
  change(
    3,
    "sync",
    "edit politician",
    {
      id: 7,
      airtableId: "recPolly",
      name: "Polly Placeholder",
      changed: { party: ["Labour", "Independent"], email: [null, "polly@example.org"] },
    },
    { politician: POLLY },
  ),
  change(
    4,
    "sync",
    "add politician",
    {
      id: 7,
      airtableId: "recPolly",
      house: "commons",
      name: "Polly Placeholder",
      salutation: "Ms Placeholder",
      constituency: "Ipswich",
      party: "Labour",
      email: null,
    },
    { politician: POLLY },
  ),
  change(5, "sync", "remove politician", { id: 98, name: "Old MP" }),
  change(6, "postmark", "block address", { address: "polly@example.org", kind: "hard" }),
  change(7, "jo@pauseai.uk", "unblock address", { address: "polly@example.org", note: "Fixed in Airtable" }),
  change(8, "jo@pauseai.uk", "view supporter", { id: 3 }, { supporter: { id: 3, name: "Jane Example" } }),
  change(9, "jo@pauseai.uk", "view supporter", { id: 4 }, { supporter: { id: 4, name: null } }),
  change(10, "jo@pauseai.uk", "erase supporter", { id: 5, reference: "ICO-12", lumaUsers: 1, letters: 2, members: 0 }),
  change(11, "admin@pauseai.uk", "add staff account", { email: "sam@pauseai.uk", to: [] }),
  change(12, "admin@pauseai.uk", "set staff permissions", {
    email: "sam@pauseai.uk",
    from: [],
    to: ["supporters", "admin"],
  }),
  change(13, "admin@pauseai.uk", "remove staff account", {
    email: "sam@pauseai.uk",
    permissions: ["supporters", "retired"],
  }),
  change(14, "sync", "hold MP sync", { added: 3, removed: 40, changed: 2 }),
  change(15, "jo@pauseai.uk", "discard held MP sync", { id: 12 }),
  change(16, "jo@pauseai.uk", "something new", {
    reason: "a test",
    ids: [1, 2],
    when: null,
    house: "atlantis",
    status: "signed",
  }),
  change(17, "postmark", "block address", { address: "odd@example.org", kind: "weird" }),
  change(
    18,
    "jo@pauseai.uk",
    "set status",
    { politicianId: 7, campaign: "regulate-letter-pm", status: "odd", date: null, note: "" },
    { politician: POLLY },
  ),
  change(19, "sync", "count something", { widgets: 2, status: "maybe", campaign: "regulate-letter-pm" }),
  change(20, "sync", "edit politician", {
    id: 98,
    name: "Old MP",
    changed: { house: ["commons", "lords"], party: ["Labour", null] },
  }),
  change(21, "jo@pauseai.uk", "apply held MP sync", { id: 13 }),
];
