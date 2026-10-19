// Every word the staff interface (/staff) shows. Placeholder copy (AGENTS.md:
// "Never write final copy"): the Latin roughly says what the English should,
// so the screens can be used meanwhile.

import type { ImportJob } from "@/lib/import-runs";

export const staffCopy = {
  metaTitle: "Staff",
  login: {
    title: "Staff log in",
    intro: "Enter your staff email to sign in on this browser.",
    emailLabel: "Email",
    button: "Send sign in link",
    sent: "Check your email and open the link in this browser.",
    again: "Try again",
    failed: "The link you used has expired or has been used already. Please request a new one.",
    elsewhere: "The link you used was made in another browser. Either open it there, or request a new one here.",
  },
  // The email with the login link.
  loginEmail: {
    subject: "Confirm sign in to PauseAI UK",
    body: (link: string, minutes: number) =>
      `Follow this link to sign in:\n\n${link}\n\nYou must use the browser you made the link with, and it will expire after ${minutes} minutes.\n\nIf you did not request this, please ignore this message.`,
  },
  nav: {
    // At the left of the bar.
    title: "PauseAI UK Staff",
    politicians: "Politicians",
    import: "Import data",
    changes: "Audit log",
    history: "Import history",
    letters: "Letters",
    emails: "⁂ Inscriptiones",
    logout: "Log out",
  },
  houses: {
    commons: "House of Commons",
    lords: "House of Lords",
    "scottish-parliament": "Scottish Parliament",
    senedd: "Welsh Parliament",
    "ni-assembly": "Northern Ireland Assembly",
    other: "Other",
  } as Record<string, string>,
  statuses: {
    signed: "Signed",
    none: "None",
  } as Record<string, string>,
  politicians: {
    title: "Politicians",
    search: "Search",
    searchButton: "Search",
    allHouses: "All houses",
    anyCampaign: "Any campaign",
    none: "None found.",
    testMp: "Test",
    notSitting: "No longer sitting",
    noEmail: "No email",
    // On a politician whose address is blocked (/staff/emails), and the filter for them.
    emailBlocked: "⁂ Inscriptio clausa",
    anyEmail: "⁂ Omnes",
    // The button in each campaign's column, and the bill's column, which
    // only the import from ControlAI's letter sets.
    markSigned: "Mark as signed",
    unmarkSigned: "Undo",
    signedControlAi: "Signed ControlAI letter",
  },
  fields: {
    name: "Name",
    salutation: "Salutation",
    constituency: "Constituency",
    party: "Party",
    email: "Email",
    house: "House",
  },
  politician: {
    statusesTitle: "Campaigns",
    detailsTitle: "About this politician",
    fromAirtable: "Information about the MP is imported from Airtable, update name / email there.",
    save: "Save",
    notFound: "Politician not found.",
    // Under their name, when their address is blocked: why, and since when.
    blocked: (reason: string, since: string) => `⁂ Inscriptio clausa ab ${since}: ${reason}`,
  },
  // The page of blocked addresses (/staff/emails), and the bounces and complaints that blocked them.
  emails: {
    title: "⁂ Inscriptiones clausae",
    intro: "⁂ Ad has inscriptiones nihil mittitur, donec aperiantur.",
    none: "⁂ Nulla.",
    allKinds: "⁂ Omnes",
    filter: "Filter",
    kinds: {
      hard: "⁂ Rediit",
      soft: "⁂ Rediit ad tempus",
      complaint: "⁂ Querela",
    } as Record<string, string>,
    columns: {
      address: "⁂ Inscriptio",
      kind: "⁂ Causa",
      since: "⁂ Ex",
      reason: "⁂ Ratio",
      whose: "⁂ Cuius",
      refused: "⁂ Non missae",
      at: "When",
      email: "⁂ Epistula",
    },
    letter: (id: number) => `⁂ Epistula ${id}`,
    purposes: {
      letter: "⁂ Epistula",
      "forwarded-reply": "⁂ Responsum",
      "staff-login": "⁂ Nexus",
      "staff-alert": "⁂ Monitio",
    } as Record<string, string>,
    // A complaint can't be undone by staff, only by the person.
    cantReset: "⁂ Aperiri non potest.",
    note: "⁂ Nota",
    unblock: "⁂ Aperi",
    problemsTitle: "⁂ Recentes",
  },
  // The email staff get when a letter hard-bounces or is complained about.
  alert: {
    subject: (mp: string) => `⁂ Epistula ad ${mp} non pervenit`,
    body: (mp: string, address: string, reason: string, link: string) =>
      `⁂ Lorem ipsum ${mp} (${address}): ${reason}\n\n${link}`,
  },
  // The nightly copy of ControlAI's letter's signatories into the bill's
  // statuses (lib/server/controlai-import.ts), on the import page.
  // The web imports, after the Airtable ones on the import page: ControlAI's
  // letter to the PM, copied nightly into the bill's statuses
  // (lib/server/controlai-import.ts).
  controlAi: {
    title: "ControlAI letter to the Prime Minister backing the Sobel bill",
    intro: {
      before: "MPs and peers who signed ",
      link: "the letter",
      after:
        " are marked as signed for the “Support the Artificial Superintelligence Bill” campaign. This can't be changed by hand.",
    },
    importNow: "Read it now",
    never: "Not read yet.",
    result: (r: { signatories: number; matched: number; added: number; removed: number }) =>
      `${r.signatories} names, ${r.matched} found here; ${r.added} added, ${r.removed} removed.`,
    columns: { name: "Name", problem: "Problem" },
    kinds: { nobody: "Nobody here", several: "Could be:" } as Record<string, string>,
  },
  syncs: {
    title: "Members of Parliament from Airtable",
    // With a link to the table in the middle.
    intro: {
      before: "From the ",
      link: "UK Parliamentarians table in Airtable",
      after: ": everyone whose Body is “House of Commons” and whose Status is blank.",
    },
    syncNow: "Import MPs now",
    none: "Not yet imported.",
    added: "Added",
    removed: "Removed",
    changed: "Changed",
    apply: "Apply",
    discard: "Discard",
  },
  // The history page: every run of every job, newest first, with a job filter.
  history: {
    title: "Import history",
    /** The filter's name for screen readers only. */
    job: "Import or check",
    allJobs: "All",
    filter: "Show",
    none: "No runs yet.",
    /** Beside each job's button on the import page. */
    showAll: "All runs",
  },
  // The line every run in the import log starts with (RunBox): how it
  // ended, when, who started it, and for a held MP import, who decided it.
  runs: {
    status: {
      ok: "Done",
      failed: "Failed",
      unchanged: "Unchanged",
      held: "Held",
      applied: "Applied",
      discarded: "Discarded",
    } as Record<string, string>,
    by: (who: string) => `by ${who}`,
    decidedBy: (who: string) => `decided by ${who}`,
  },
  check: {
    title: "Members of Parliament against Parliament's list",
    // With a link to the API in the middle.
    intro: {
      before: "Compares the MPs imported from Airtable with ",
      link: "Parliament's Members API",
      after:
        ", and lists where they disagree. Nothing is changed: fix problems in Airtable, and the next import copies the fix.",
    },
    checkNow: "Check now",
    never: "Never checked",
    allGood: "All good.",
    problems: (n: number) => `${n} problem${n === 1 ? "" : "s"}`,
    columns: {
      constituency: "Constituency",
      problem: "Problem",
      airtable: "Here / Airtable",
      parliament: "Parliament",
    },
    kinds: {
      unofficial: "Unofficial constituency name",
      missing: "Missing from here / Airtable",
      extra: "Missing from Parliament",
      name: "Name differs",
      email: "Email differs",
    } as Record<string, string>,
    noEmail: "None",
  },
  import: {
    // The page, with every import: the MPs and the signatories from
    // Airtable, and ControlAI's letter from the web.
    pageTitle: "Import data",
    title: "Signatories of the 2026 letter to the Prime Minister",
    intro: {
      before: "Everyone ticked “Signed Frontier AI Letter” in the ",
      link: "UK Parliamentarians table in Airtable",
      after: " is marked as signed for the “Regulate AI developers now” campaign here.",
    },
    // The lozenges next to each import's heading: where it's from, and how often it runs.
    airtable: "Airtable",
    web: "Web",
    nightly: "Nightly",
    oneOff: "One-off",
    checkOnly: "Check only",
    button: "Import signatories",
    none: "Not imported yet.",
    note: "From Airtable",
    // matched + added is everyone ticked in Airtable; alreadySet is those of them already marked here.
    result: (r: { matched: number; added: number; alreadySet: number }) =>
      `${r.matched + r.added} ticked in Airtable: ${r.matched} matched politicians already here, ${r.added} added as new, ${r.alreadySet} were already marked as signed.`,
  },
  letters: {
    title: "Letters",
    allStatuses: "All",
    filter: "Filter",
    none: "No letters.",
    status: {
      sending: "Sending",
      sent: "Sent",
      not_sent: "⁂ Non missa",
      bounced: "Bounced",
      spam_complaint: "Spam complaint",
      replied: "Replied",
      auto_reply: "Auto-reply",
    } as Record<string, string>,
    columns: {
      created: "Created",
      from: "From",
      consent: "Consent",
      to: "To",
      campaign: "Campaign",
      status: "Status",
      replied: "Replied",
      history: "History",
    },
    consent: { yes: "Yes", no: "No" },
  },
  changes: {
    title: "Audit log",
    at: "When",
    actor: "Who",
    action: "What",
    details: "Details",
  },
};

/** Each job in the import log, by the title of its section on the import page: the history page's filter and lines. */
export const jobTitles: Record<ImportJob, string> = {
  "sync-mps": staffCopy.syncs.title,
  "check-mps": staffCopy.check.title,
  "import-controlai": staffCopy.controlAi.title,
  "import-signatories": staffCopy.import.title,
};
