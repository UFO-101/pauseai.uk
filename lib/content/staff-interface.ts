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
    // At the left of the bar, and the way to the home page.
    title: "PauseAI UK Staff",
    home: "⁂ Domus",
    permissions: "⁂ Potestates",
    // The groups the pages are in, on the home page.
    sections: {
      politicians: "⁂ Politici",
      letters: "⁂ Epistulae",
      email: "⁂ Cursus electronicus",
      data: "⁂ Data",
      admin: "⁂ Administratio",
    } as Record<string, string>,
    politicians: "Politicians",
    import: "Import data",
    changes: "Audit log",
    history: "Import history",
    letters: "Letters",
    emails: "Blocked emails",
    logout: "Log out",
  },
  // The home page: the pages you can see, in groups, and whom to ask for more.
  home: {
    title: "⁂ Domus",
    // Everyone sees the ordinary pages; this says which extra permissions
    // you have, or that you have none and whom to ask.
    permissions: (list: string) => `⁂ Potestates tuae: ${list}.`,
    none: "⁂ Nullas potestates praeter paginas ordinarias habes.",
    ask: (admins: string) => `⁂ Pete ab ${admins}.`,
  },
  // The permissions page (/staff/permissions), for admins.
  permissions: {
    title: "⁂ Potestates",
    intro: "⁂ Quisque cum inscriptione pauseai.uk intrare potest; hae potestates plus permittunt.",
    names: {
      admin: "⁂ Administrator",
      supporters: "⁂ Fautores",
    } as Record<string, string>,
    columns: {
      email: "Email",
      permissions: "⁂ Potestates",
      grantedBy: "⁂ Data a",
      grantedAt: "⁂ Quando",
    },
    builtIn: "⁂ Semper omnia",
    save: "⁂ Servare",
    addTitle: "⁂ Addere",
    emailLabel: "Email",
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
    // On a politician whose address is blocked (/staff/blocked-emails), and the filter for them.
    emailBlocked: "Email blocked",
    anyEmail: "All",
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
    blocked: (reason: string, since: string) => `Email blocked since ${since}: ${reason}`,
  },
  // The page of blocked addresses (/staff/blocked-emails), and the bounces and complaints that blocked them.
  emails: {
    title: "Blocked emails",
    intro: "Nothing is sent to these addresses until they're unblocked.",
    none: "None.",
    allKinds: "All",
    filter: "Filter",
    kinds: {
      hard: "Bounced",
      soft: "Soft bounce",
      complaint: "Complaint",
    } as Record<string, string>,
    columns: {
      address: "Address",
      kind: "Cause",
      since: "Since",
      reason: "Reason",
      whose: "Whose",
      refused: "Not sent since",
      at: "When",
      email: "Email",
    },
    letter: (id: number) => `Letter ${id}`,
    purposes: {
      letter: "Letter",
      "forwarded-reply": "Forwarded reply",
      "staff-login": "Staff login link",
      "staff-alert": "Staff alert",
    } as Record<string, string>,
    // A complaint can't be undone by staff, only by the person.
    cantReset: "Can't be unblocked: they marked our email as spam.",
    note: "Note",
    unblock: "Unblock",
    problemsTitle: "Recent",
  },
  // The email staff get when a letter hard-bounces or is complained about.
  // Postmark's reason sometimes ends in a full stop and sometimes doesn't.
  alert: {
    subject: (mp: string) => `A letter to ${mp} bounced`,
    body: (mp: string, address: string, reason: string, link: string) =>
      `A letter to ${mp} (${address}) didn't arrive: ${reason.replace(/\.+$/, "")}. Nothing more will be sent to that address until it's fixed in Airtable and unblocked here: ${link}`,
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
  // The hourly copy of the Luma calendar's events, guests and contacts
  // (lib/server/luma-import.ts), on the import page.
  luma: {
    title: "⁂ Eventus hospitesque ex Luma",
    intro: {
      before: "⁂ Eventus publici ",
      link: "⁂ calendarii nostri in Luma",
      after: " ⁂, hospites qui ad eos nomen dederunt, et qui calendarium sequuntur, singulis horis.",
    },
    importNow: "⁂ Nunc importare",
    never: "⁂ Nondum importatum.",
    // The counts of a run, then why it stopped early, if it did.
    result: (r: {
      events: number;
      eventsSynced: number;
      eventsLeft: number;
      guestsChanged: number;
      people: number;
      contacts: number;
      supportersAdded: number;
      linked: number;
      requests: number;
    }) =>
      `⁂ ${r.events} eventus mutati; ${r.eventsSynced} indices hospitum lecti, ${r.eventsLeft} restant; ${r.guestsChanged} hospites, ${r.people} personae, ${r.contacts} contactus mutati; ${r.supportersAdded} fautores novi, ${r.linked} nexus; ${r.requests} petitiones.`,
    stoppedBy: {
      time: "⁂ Tempore exhausto desiit.",
      "rate-limit": "⁂ Limite petitionum Luma desiit.",
      running: "⁂ Alius cursus iam currebat.",
    } as Record<string, string>,
  },
  syncs: {
    title: "Members of Parliament from Airtable",
    // With a link to the table in the middle.
    intro: {
      before: "From the ",
      link: "UK Parliamentarians table in Airtable",
      after: ": everyone whose Body is “House of Commons” and whose Status is blank.",
    },
    /** The test MPs (lib/test-mps.json) aren't in Airtable; every import adds any that are missing. */
    testMps: "Each import also adds the test MPs, who aren’t in Airtable, if any are missing.",
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
    luma: "⁂ Luma",
    nightly: "Nightly",
    hourly: "⁂ Horarium",
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
      not_sent: "Not sent",
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
  "import-luma": staffCopy.luma.title,
};
