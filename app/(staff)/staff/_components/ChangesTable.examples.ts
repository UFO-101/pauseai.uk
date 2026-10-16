import type { AuditEntry } from "@/lib/server/audit";

/** A staff member setting a politician's status. */
export const exampleChange: AuditEntry = {
  id: 1,
  at: "2026-10-12T09:00:00Z",
  actor: "jo@pauseai.uk",
  action: "set status",
  details: { politicianId: 7 },
};
