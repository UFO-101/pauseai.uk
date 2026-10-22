// Every word the staff interface (/staff) shows.

import type { ImportJob } from "@/lib/import-runs";

export const staffCopy = {
  metaTitle: "Pause AI Staff",
  login: {
    title: "Staff log in",
    intro: "Enter your staff email to sign in on this browser.",
    emailLabel: "Email",
    keep: "Keep me signed in",
    button: "Send sign in link",
    sent: "Check your email and open the link in this browser.",
    again: "Try again",
    failed: "The link you used has expired or has been used already. Please request a new one.",
    elsewhere: "The link you used was made in another browser. Either open it there, or request a new one here.",
  },
  // The dev login's box under the login card, in a fixture build only.
  devLogin: {
    title: "Development only: sign in now as",
    hint: "This appears when DATA_FIXTURES=1 and never in production.",
    // Beside each address: what it may do.
    permissions: (names: string) => `${names} permissions`,
    noPermissions: "Account with no permissions",
    noAccount: "No account",
  },
  // The email with the login link.
  loginEmail: {
    subject: "Confirm sign in to PauseAI UK",
    body: (link: string, minutes: number) =>
      `Follow this link to sign in:\n\n${link}\n\nYou must use the browser you made the link with, and it will expire after ${minutes} minutes.\n\nIf you did not request this, please ignore this message.`,
  },
  nav: {
    // At the left of the bar, and the way to the home page.
    title: "PauseAI Staff",
    home: "Home",
    accounts: "Staff accounts",
    // The groups the pages are in, on the home page.
    sections: {
      supporters: "Supporters",
      politicians: "Politicians",
      email: "Email",
      data: "Data",
      admin: "Admin",
    } as Record<string, string>,
    supporters: "Supporters",
    politicians: "Politicians",
    import: "Import data",
    changes: "Audit log",
    history: "Import history",
    letters: "Letters to MPs",
    emails: "Blocked emails",
    logout: "Log out",
  },
  // The home page: whom to ask for an account; or the pages you can see,
  // in groups, and which permissions you have, or that you have none.
  home: {
    title: "Home",
    // The dashboard: what needs a person, then the window's numbers in
    // three groups, each against the window before, then the imports' health.
    dashboard: {
      // What's waiting for someone: each kind of item, its detail, and its button.
      actionsTitle: "Needs a person",
      nothingToDo: "⁂ Nothing needs a person.",
      actions: {
        heldSync: "⁂ MP import held",
        heldSyncDetail: (added: number, removed: number, changed: number, since: string) =>
          `⁂ ${added} MPs would be added, ${removed} would go, ${changed} would change · since ${since}`,
        decide: "⁂ Decide",
        blockedMp: (name: string) => `⁂ ${name}'s email bounced`,
        blockedMpDetail: (reason: string, since: string) => `⁂ Address blocked since ${since}: ${reason}`,
        openMp: "⁂ Open MP",
        failedImport: (job: string) => `⁂ ${job} failed`,
        failedImportDetail: (error: string, at: string) => `⁂ ${error} · ${at}`,
        seeRun: "⁂ See run",
      },
      // The window: its length in days, each a link but the one shown.
      window: (days: number) => `⁂ ${days} days`,
      windows: "⁂ Show",
      sections: {
        mps: "⁂ MPs",
        events: "⁂ Events",
        supporters: "⁂ Supporters",
      } as Record<string, string>,
      // After each number: what it counts, for one and for more.
      metrics: {
        lettersSent: (n: number) => (n === 1 ? "⁂ letter to an MP" : "⁂ letters to MPs"),
        lettersReplied: (n: number) => (n === 1 ? "⁂ letter got a reply" : "⁂ letters got a reply"),
        mpsSigned: (n: number) => (n === 1 ? "⁂ MP signed" : "⁂ MPs signed"),
        eventRegistrations: (n: number) => (n === 1 ? "⁂ event registration" : "⁂ event registrations"),
        eventsHeld: (n: number) => (n === 1 ? "⁂ event held" : "⁂ events held"),
        supportersAdded: (n: number) => (n === 1 ? "⁂ new supporter" : "⁂ new supporters"),
        unsubscribes: (n: number) => (n === 1 ? "⁂ unsubscribe from Luma emails" : "⁂ unsubscribes from Luma emails"),
      } as Record<string, (n: number) => string>,
      // A count of nothing, instead of a 0.
      none: "⁂ None",
      // Beside the letters' number: those to the test MPs, left out of it.
      testLetters: (n: number) => `⁂ +${n} test`,
      // Under the number: against the window before.
      change: {
        up: (n: number, days: number) => `⁂ ▲ ${n} on the ${days} days before`,
        down: (n: number, days: number) => `⁂ ▼ ${n} on the ${days} days before`,
        same: (days: number) => `⁂ Same as the ${days} days before`,
      },
      // A sparkline: its name for screen readers, and the label on a point.
      series: (what: string) => `⁂ ${what}, the last eight windows`,
      seriesPoint: (from: string, n: number) => `⁂ From ${from}: ${n}`,
      importsTitle: "Imports",
      allWell: "All imports running well.",
      notWell: (n: number) => (n === 1 ? "⁂ An import isn't running well." : `⁂ ${n} imports aren't running well.`),
      neverRun: "Never run",
    },
    noAccount: "You don't have a staff account yet.",
    none: "You have no permissions.",
    ask: (admins: string) => `Ask ${admins}.`,
  },
  // The supporters list (/staff/supporters) and a supporter's page.
  supporters: {
    title: "Supporters",
    none: "Nobody found.",
    count: (total: number, page: number, pages: number) => `${total} supporters; page ${page} of ${pages}.`,
    previous: "Previous",
    next: "Next",
    filters: {
      search: "Name, email or phone",
      source: "Source",
      anySource: "Any",
      events: "Luma events",
      anyEvents: "Any",
      registered: "Registered for one or more",
      lists: "Mailing lists",
      anyList: "Any",
      active: "Last active",
      anyTime: "Any time",
      activeWithin: {
        "30": "In the last 30 days",
        "90": "In the last 90 days",
        "365": "In the last year",
        older: "Over a year ago",
      } as Record<string, string>,
      from: "First seen from",
      to: "First seen to",
      unsubscribed: "Unsubscribed",
      sort: "Sort by",
      sorts: {
        active: "Last activity",
        first: "First sign-up",
        name: "Name",
        events: "Luma events",
        letters: "Letters to MP",
      } as Record<string, string>,
      filter: "Search",
    },
    columns: {
      name: "Name",
      email: "Email",
      badges: "Activities",
      firstSeen: "First sign-up",
      lastActive: "Last activity",
      events: "Luma events",
      letters: "Letters to MP",
      optedOut: "Unsubscribed",
    },
    noName: "(no name)",
    moreEmails: (n: number) => `+${n}`,
    // The badges: the sources a supporter is in, and what they did there.
    badges: {
      lumaContact: "Follows Luma",
      registered: "Luma events",
      letter: "Wrote to MP",
    },
    sources: { luma: "Luma", letter: "Letter" } as Record<string, string>,
    lists: { "luma-calendar": "Luma calendar emails" } as Record<string, string>,
    // A supporter's page: one box of what we know, then the history.
    detail: {
      emails: "Email",
      phone: "Phone",
      postcode: "Postcode",
      firstSeen: "First seen",
      lastActive: "Last activity",
      /** Where a detail came from and when: "Luma, 26 Sept 2026". */
      from: (sources: string, when: string) => `${sources}, ${when}`,
      optedOut: (since: string) => `unsubscribed ${since}`,
      notOptedOut: "subscribed",
      activityTitle: "History",
      noActivity: "Nothing yet.",
      kinds: {
        "luma-contact": "Followed the Luma calendar",
        "luma-registered": "Registered for",
        letter: "Wrote to",
        "letter-replied": "⁂ Letter answered by",
        "opted-out": "Unsubscribed from",
        resubscribed: "Subscribed again to",
      } as Record<string, string>,
      // A registration's status, shown only when it isn't approved.
      statuses: {
        pending_approval: "awaiting approval",
        waitlist: "waitlisted",
        declined: "declined",
      } as Record<string, string>,
    },
  },
  // Erasing a supporter: the red button at the foot of their page, and the
  // page it goes to, with the form; then the list's notice afterwards.
  erase: {
    title: "Erase this supporter",
    // Beside the button, at the foot of the supporter's page.
    note: "If they've asked to be forgotten, for example a GDPR request.",
    intro:
      "For when someone asks to be forgotten, for example a GDPR erasure request. Everything we hold about this person is deleted: letters, event registrations, their Luma contact. We keep references to them in blocked addresses and unsubscribes.",
    referenceLabel: "Request reference",
    referenceHint:
      "Put the number or date of the request for the audit log. Don't give personal information about the person as that gets logged.",
    confirm: "I'm sure: this person asked to be erased.",
    button: "Erase",
    cancel: "Cancel",
    done: "Erased.",
  },
  // The accounts page (/staff/accounts), for admins: who may use the staff
  // pages, and what each may do.
  accounts: {
    title: "Staff accounts",
    intro: "Only people with a @pauseai.uk address who are in this list can log in. ",
    names: {
      admin: "Admin",
      supporters: "Supporters",
    } as Record<string, string>,
    // Under the table, after each permission's name: what it opens.
    opens: {
      supporters: "the supporter pages: who has come to events, follows the calendar or wrote to their MP.",
      admin: "this page, to add and remove staff and set permissions, and the audit log.",
    } as Record<string, string>,
    columns: {
      email: "Email",
      permissions: "Permissions",
      addedBy: "Added by",
      addedAt: "When",
    },
    save: "Save",
    // The button on the form for someone new.
    add: "Add",
    remove: "Remove",
    addTitle: "Add someone",
    emailLabel: "Email",
    // When a change would leave no admin.
    lastAdmin: "The last administrator can't be removed or lose permissions to administrate.",
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
    // The counts in the list: letters written to them, and how many of those got a reply.
    columns: {
      letters: "Letters",
      replies: "Letters answered",
    },
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
    // The box at the top of their page: where they came from, and each campaign's status.
    source: "Source",
    sources: {
      airtable: "Airtable's MPs",
      staff: "Added by staff",
      test: "A test MP",
    },
    // A status: who set it and when; the campaign's title heads the line.
    setBy: (who: string, when: string) => `set by ${who}, ${when}`,
    historyTitle: "History",
    noHistory: "Nothing yet.",
    // What each line of the history was: a letter, a reply, or an entry of the audit log about them.
    history: {
      letter: "Letter from",
      "letter-replied": "Answered the letter from",
      "add politician": "Added",
      "edit politician": "Details edited",
      "remove politician": "No longer sitting",
      "set status": "Status set",
      "block address": "Address blocked",
      "unblock address": "Address unblocked",
    } as Record<string, string>,
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
    note: "Note - give reason",
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
    importNow: "Import ControlAI letter",
    never: "Not read yet.",
    result: (r: { signatories: number; matched: number; added: number; removed: number }) =>
      `${r.signatories} names, ${r.matched} found here; ${r.added} added, ${r.removed} removed.`,
    columns: { name: "Name", problem: "Problem" },
    kinds: { nobody: "Nobody here", several: "Could be:" } as Record<string, string>,
  },
  // The hourly copy of the Luma calendar's events, guests and contacts
  // (lib/server/luma-import.ts), on the import page.
  luma: {
    title: "Events and guests from Luma",
    intro: {
      before: "The public events on ",
      link: "our Luma calendar",
      after: ", who registered for each, and who follows the calendar, every hour.",
    },
    importNow: "Import Luma",
    never: "Not imported yet.",
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
      `${r.events} events changed; ${r.eventsSynced} guest lists read, ${r.eventsLeft} waiting; ${r.guestsChanged} guests, ${r.people} people, ${r.contacts} contacts changed; ${r.supportersAdded} new supporters, ${r.linked} linked; ${r.requests} requests.`,
    stoppedBy: {
      time: "Stopped: out of time.",
      "rate-limit": "Stopped: near Luma's rate limit.",
      running: "Another run was already going.",
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
    syncNow: "Import MPs",
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
    // The tag on a run that stopped before it finished.
    incomplete: "Incomplete",
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
    checkNow: "Check MPs",
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
    luma: "Luma",
    nightly: "Nightly",
    hourly: "Hourly",
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
    title: "Letters to MPs",
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
      replied: "Answered",
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
