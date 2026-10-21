import type { Dashboard } from "@/lib/staff-dashboard";
import { exampleFailedRun, exampleLumaResult, exampleRun } from "./RunList.examples";

/** A week with something in every tile, up and down on the week before; the Luma import stopped short, the ControlAI import failed, the signatories never ran. */
export const exampleDashboard: Dashboard = {
  since: "2026-10-14T12:00:00.000Z",
  counts: {
    lettersSent: { week: 12, previous: 8 },
    lettersReplied: { week: 3, previous: 5 },
    lettersBounced: { week: 1, previous: 0 },
    mpsSigned: { week: 2, previous: 2 },
    supportersAdded: { week: 18, previous: 11 },
    eventRegistrations: { week: 27, previous: 30 },
    unsubscribes: { week: 1, previous: 3 },
    addressesBlocked: { week: 0, previous: 0 },
  },
  imports: [
    exampleRun(
      "import-luma",
      { ...exampleLumaResult, eventsLeft: 4, stoppedBy: "time" },
      { id: 5, at: "2026-10-21T11:17:00Z" },
    ),
    exampleRun(
      "sync-mps",
      { changes: { added: [], removed: [], changed: [] } },
      { id: 4, at: "2026-10-21T00:00:00Z", status: "unchanged" },
    ),
    exampleRun("check-mps", { problems: [] }, { id: 3, at: "2026-10-21T01:00:00Z" }),
    exampleFailedRun("import-controlai", "No PDF linked", { id: 2, at: "2026-10-21T02:00:00Z" }),
    undefined,
  ],
};
