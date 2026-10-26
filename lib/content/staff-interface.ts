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
    noAccount: "No account yet: logging in makes one",
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
    // The sections the pages are in, in the sidebar.
    sections: {
      supporters: "Supporters",
      politicians: "Politicians",
      admin: "Admin",
    } as Record<string, string>,
    supporters: "Supporters",
    politicians: "Politicians",
    import: "Import data",
    changes: "Audit log",
    letters: "Letters to MPs",
    supporterEmails: "Blocked emails",
    mpEmails: "Blocked MP emails",
    logout: "Log out",
    // Under Log out, faintly, only with more than one session open: how many, linked to the page of them.
    sessions: (n: number) => `${n} sessions`,
  },
  // The page of your own sessions (/staff/sessions): one row each, and a way to end them all.
  sessions: {
    title: "Your sessions",
    intro: "Everywhere you're logged in to the PauseAI Staff pages.",
    columns: {
      browser: "Browser",
      system: "System",
      started: "Logged in",
      ends: "Ends",
      kept: "Kept signed in",
    },
    kept: { yes: "Yes", no: "No" } as Record<string, string>,
    // Beside the session of the browser looking.
    thisBrowser: "This browser",
    // A browser or system we can't name from what the browser sent.
    unknown: "Unknown",
    logOutEverywhere: "Log out of all of them",
  },
  // The home page: the dashboard.
  home: {
    title: "Home",
    // The dashboard: what needs a person, then the window's numbers in
    // three groups, each against the window before.
    dashboard: {
      // What's waiting for someone, shown only when something is: each kind of item, its detail, and its button.
      // The list's name, read out by a screen reader; not shown.
      actionsTitle: "Needs a person",
      actions: {
        heldSync: (changes: number) => `MP import would change ${changes} MPs`,
        // Why it's held, and what to do.
        heldSyncDetail:
          "That's a lot of MPs, so please check it, and approve or decline it. Fix any problems in Airtable.",
        decide: "Review import",
        blockedMp: (name: string) => `${name}'s email is bouncing`,
        blockedMpDetail: "Find a working email for this MP if it has changed, or unblock if working now.",
        openMp: "Fix MP email",
        failedImport: (job: string) => `Import '${job}' failed`,
        failedImportDetail: (error: string, at: string) => `Error: "${error}" · ${at}`,
        seeRun: "See failed run",
      },
      // The window: its length in days, each a link but the one shown.
      window: (days: number) => `${days} days`,
      windows: "Show",
      sections: {
        mps: "MPs",
        events: "Events",
        supporters: "Supporters",
      } as Record<string, string>,
      // After each number: what it counts, for one and for more.
      metrics: {
        lettersSent: (n: number) => (n === 1 ? "letter to an MP" : "letters to MPs"),
        lettersReplied: (n: number) => (n === 1 ? "letter got a reply" : "letters got a reply"),
        mpsSigned: (n: number) => (n === 1 ? "MP signed" : "MPs signed"),
        eventRegistrations: (n: number) => (n === 1 ? "event registration" : "event registrations"),
        eventsHeld: (n: number) => (n === 1 ? "event held" : "events held"),
        supportersAdded: (n: number) => (n === 1 ? "new supporter" : "new supporters"),
        unsubscribes: (n: number) => (n === 1 ? "unsubscribe from Luma emails" : "unsubscribes from Luma emails"),
      } as Record<string, (n: number) => string>,
      // A count of nothing, instead of a 0.
      none: "None",
      // Beside the letters' number: those to the test MPs, left out of it.
      testLetters: (n: number) => `+${n} test`,
      // Under the number: against the window before.
      change: {
        up: (n: number, days: number) => `▲ ${n} on the ${days} days before`,
        down: (n: number, days: number) => `▼ ${n} on the ${days} days before`,
        same: (days: number) => `Same as the ${days} days before`,
      },
      // A sparkline's name, which only screen readers read: the tile's label
      // ("event registrations"), and the span the line covers.
      series: (what: string, days: number, points: number) =>
        days === 7
          ? `Sparkline of ${what}, week by week over the last ${points} weeks`
          : `Sparkline of ${what}, ${days} days at a time over the last ${days * points} days`,
      // A point's label: the window it counts, by the day it begins.
      seriesPoint: (days: number, from: string, n: number) =>
        days === 7 ? `Week beginning ${from}: ${n}` : `${days} days beginning ${from}: ${n}`,
    },
  },
  // The supporters list (/staff/supporters) and a supporter's page.
  supporters: {
    title: "Supporters",
    none: "Nobody found.",
    count: (total: number, page: number, pages: number) => `${total} supporters; page ${page} of ${pages}.`,
    filters: {
      search: "Name, email or phone",
      // The other filters are named after their columns.
      anyActivity: "Any",
      anySubscription: "Any",
      // An option in the Subscriptions filter, under its topic's name: a reason the topic gives,
      // short, as the closed select shows only the one chosen.
      states: {
        "luma-calendar": {
          following: "Luma: contact",
          unsubscribed: "Luma: unsubscribed",
          "not-following": "Luma: not a contact",
        },
        "pauseai-updates": {
          asked: "Updates: asked",
          joined: "Updates: joined before July 2026",
          declined: "Updates: declined",
          unsubscribed: "Updates: unsubscribed",
          removed: "Updates: removed",
        },
        "events-and-ways-to-help": {
          asked: "Events: agreed",
          declined: "Events: didn't agree",
        },
      } as Record<string, Record<string, string>>,
    },
    columns: {
      name: "Name",
      email: "Email",
      badges: "Activities",
      subscriptions: "Subscriptions",
      firstSeen: "First sign-up",
      lastActive: "Last activity",
      events: "Luma events",
      letters: "Letters to MP",
    },
    noName: "(no name)",
    moreEmails: (n: number) => `+${n}`,
    // The badges: the sources a supporter is in, and what they did there.
    badges: {
      lumaContact: "Luma contact",
      registered: "Luma events",
      letter: "Wrote to MP",
      member: "Member",
    },
    // In the list, a lozenge per topic we'd email them about.
    subscriptions: {
      topics: {
        "luma-calendar": "Luma",
        "pauseai-updates": "Updates",
        "events-and-ways-to-help": "Events and help",
      } as Record<string, string>,
      // A yes that an unsubscribe we can't see may have undone.
      unsure: (topic: string) => `${topic}, unsure`,
      // Every address they have is blocked.
      blocked: "Blocked",
    },
    sources: { luma: "Luma", letter: "Letter", member: "Member" } as Record<string, string>,
    lists: { "luma-calendar": "Luma calendar emails", "pauseai-updates": "PauseAI updates" } as Record<string, string>,
    // A supporter's page: one box of what we know, then the history.
    detail: {
      emails: "Email",
      phone: "Phone",
      postcode: "Postcode",
      city: "City",
      /** Where the join form was: through our own site, or on another. */
      joinedOn: (site: string) => (site === "pauseai.uk" ? `through ${site}` : `on ${site}`),
      /** What they chose on the join form; "Keep informed" and "None" say nothing more. */
      intents: {
        Volunteer: "wants to volunteer",
        Lead: "wants to lead",
        "Act now": "wants to act now",
      } as Record<string, string>,
      firstSeen: "First seen",
      lastActive: "Last activity",
      /** Where a city came from when it's their newest event's, not one they gave. */
      fromEvent: (when: string) => `their newest Luma event, ${when}`,
      /** Where a detail came from and when: "Luma, 26 Sept 2026". */
      from: (sources: string, when: string) => `${sources}, ${when}`,
      // Under the main box: a tile per topic, saying whether we'd email them about it, and why.
      listsTitle: "Subscriptions",
      permissions: {
        topics: {
          "luma-calendar": "Luma calendar emails",
          "pauseai-updates": "PauseAI updates",
          "events-and-ways-to-help": "Events and ways to help",
        } as Record<string, string>,
        yes: "Will email",
        no: "Won't email",
        // A yes that an unsubscribe we can't see may have undone.
        unsure: "Don't know",
        why: "details",
        // The short reason under the answer, by topic and reason, with when.
        reasons: {
          "luma-calendar": {
            following: (when: string) => `A contact of the calendar since ${when}`,
            unsubscribed: (when: string) => `Unsubscribed ${when}, via Luma`,
            "not-following": () => "Not a contact of the calendar",
          },
          "pauseai-updates": {
            asked: (when: string) => `Asked for them when joining, ${when}`,
            joined: (when: string) => `On the list since joining, ${when}`,
            declined: (when: string) => `Left “Keep me informed” unticked when joining, ${when}`,
            unsubscribed: (when: string) => `Unsubscribed ${when}`,
            removed: () => "No longer shared with us",
          },
          "events-and-ways-to-help": {
            asked: (when: string) => `Agreed on their letter, ${when}`,
            declined: (when: string) => `Didn't agree on their letter, ${when}`,
          },
        } as Record<string, Record<string, (when: string) => string>>,
        // Behind "Why?": how we know, and what we can't.
        details: {
          "luma-calendar":
            "Luma emails the calendar's contacts about new events, unless they've unsubscribed. Registering for an event makes someone a contact, as following the calendar does. We hear of unsubscribes only since 22 Oct 2026, when we added a webhook, so a contact from before then is “Don't know”. Luma doesn't tell us when someone unfollows.",
          "pauseai-updates":
            "“Keep me informed” on the join form has been optional since 30 June 2026. Before then everyone who joined was on the list. Unsubscribes since joining are in CiviCRM, which we don't read yet, so we usually have to put “Don't know” here.",
          "events-and-ways-to-help":
            "The box on Email your MP, “Tell me about events where I can talk to my MP and ways to help PauseAI”, on their newest letter.",
        } as Record<string, string>,
        // One tile in place of the topics', when the address is blocked.
        blocked: "Won't email: address blocked",
        blockedBecause: {
          hard: (when: string) => `An email to it bounced, ${when}.`,
          complaint: (when: string) => `They marked an email as spam, ${when}.`,
        } as Record<string, (when: string) => string>,
        seeBlocked: "See blocked emails",
      },
      activityTitle: "History",
      // Between the MP a letter went to, or who answered it, and its campaign.
      about: "about",
      noActivity: "Nothing yet.",
      kinds: {
        "luma-contact": "Became a contact of the Luma calendar",
        "luma-registered": "Registered for",
        letter: "Wrote to",
        "letter-replied": "Letter answered by",
        "member-joined": "Joined PauseAI",
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
      "For when someone asks to be forgotten, for example a GDPR erasure request. Everything we hold about this person is deleted: letters, event registrations, their Luma contact, our copy of their PauseAI membership. We keep references to them in blocked addresses and unsubscribes. The global team's own copy of their membership has to be erased by asking them.",
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
    intro:
      "Everyone with a @pauseai.uk address gets an account, with no permissions, the first time they log in. Add someone here to give them permissions before then.",
    names: {
      admin: "Admin",
      supporters: "Supporters",
    } as Record<string, string>,
    // Under the table, a heading, then after each permission's name: what it opens.
    permissionsKey: "Permissions key",
    opens: {
      supporters: "View information about supporters, include personal details.",
      admin: "Set permissions for staff accounts and view the audit log.",
    } as Record<string, string>,
    columns: {
      email: "Email",
      permissions: "Permissions",
      added: "Added",
      lastLogin: "Last login",
      lastSeen: "Last seen",
      sessions: "Sessions open",
    },
    // In the Added column, after when: who added the account, or that its first login did.
    addedBy: (who: string) => `by ${who}`,
    addedByLogin: "by login",
    // For an account that has never logged in or been seen.
    never: "Never",
    // On each row with sessions open: ends them all; on your own row, the warning beside it.
    endSessions: "Log out everywhere",
    endsYours: "This logs you out too.",
    // Under the last row: the field for the address of someone new (its
    // label, read aloud) and its button, which adds them as a row, saved
    // with the others.
    addTitle: "Add email",
    add: "Add",
    remove: "Remove",
    // Beside Add, or above the table after a Save, when the address isn't at pauseai.uk.
    notPauseai: "Only addresses @pauseai.uk can have an account.",
    // Beside Add, when the address is in the table already.
    alreadyThere: "They're in the table already.",
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
    none: "Not signed",
  } as Record<string, string>,
  politicians: {
    title: "Politicians",
    // The search box's label: what it searches.
    search: "Name, constituency, party or email",
    allHouses: "All houses",
    allParties: "All parties",
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
    // On a politician whose address is blocked (/staff/politicians/blocked-emails).
    emailBlocked: "Email blocked",
    // The button in each campaign's column, and the bill's column, which
    // only the import from ControlAI's letter sets.
    markSigned: "Mark as signed",
    unmarkSigned: "Remove signature",
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
    // A campaign status set or cleared, in the history: around the campaign's name, which links to its page.
    statusSet: (status: string) => ({ before: `${status} '`, after: "'" }),
    statusCleared: { before: "No longer marked as signed '", after: "'" },
    noHistory: "Nothing yet.",
    // What each line of the history was: a letter, a reply, or an entry of the audit log about them.
    history: {
      letter: "Letter from",
      "letter-replied": "Answered the letter from",
      // Without the supporters permission, a letter doesn't say who wrote it.
      unsignedLetter: "Letter written to them",
      "unsigned-letter-replied": "Answered a letter",
      "add politician": "Added",
      "edit politician": "Details edited",
      "remove politician": "No longer sitting",
      "block address": "Address blocked",
      "unblock address": "Address unblocked",
    } as Record<string, string>,
    // On an MP from Airtable, after the source, which links to their record there.
    editInAirtable: ", update name / email there.",
    // On the bill's row of the campaigns panel: its status isn't set by hand.
    fromControlAi: "set each night from ControlAI's letter",
    // On each row of the campaigns panel: the link to the campaign's public page.
    campaignPage: "Campaign page",
    // Under their name: what they are, in their house, and where for.
    roles: {
      commons: "MP",
      lords: "Member of the House of Lords",
      "scottish-parliament": "MSP",
      senedd: "MS",
      "ni-assembly": "MLA",
      other: "Politician",
    } as Record<string, string>,
    role: (role: string, constituency: string | null, sitting: boolean) =>
      `${sitting ? "" : "Formerly "}${role}${constituency ? ` for ${constituency}` : ""}`,
    notFound: "Politician not found.",
    // Under their name, when their address is blocked: what's happened, what to check, and the form.
    blocked: {
      title: "Letters to this MP aren't being sent",
      // Around the address, which is in bold. Postmark's reason sometimes ends in a full stop and sometimes doesn't.
      why: {
        before: "Email to ",
        after: (reason: string, since: string) => ` bounced on ${since} with the error: ${reason.replace(/\.+$/, "")}.`,
      },
      // Under it, two things to do, side by side. If the address is wrong: correct it in
      // Airtable (linked to their record, or the table for an MP not from it), then run
      // the import (linked to its page). A new address isn't blocked.
      wrong: {
        title: "Address wrong?",
        before: "Correct it in ",
        airtable: "Airtable",
        middle: ", then run the ",
        link: "nightly import",
        after: ". The new address isn't blocked.",
      },
      // If the address is right: unblock it, with the note of why.
      right: {
        title: "Address right?",
        text: "If the bounce was a one-off, unblock it.",
      },
    },
  },
  // The pages of blocked addresses (/staff/politicians/blocked-emails and
  // /staff/supporters/blocked-emails), and the bounces and complaints that blocked them.
  emails: {
    // The two pages: politicians' addresses, and everyone else's.
    titles: {
      mps: "Blocked MP emails",
      supporters: "Blocked supporter emails",
    },
    intro: "Nothing is sent to these addresses until they're unblocked.",
    // Instead of the table, when no address is blocked, or none of the cause filtered for.
    noBlocks: "No addresses are blocked.",
    // Instead of the history, when nothing has bounced or been complained about.
    noProblems: "Nothing has bounced or been marked as spam.",
    allKinds: "All",
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
      // In the history: what the email that bounced was, a letter or one of ours.
      sent: "Type of email",
    },
    // The email was a letter: before the name of the politician it was to, the two linked to the letter.
    letterTo: "Letter to",
    purposes: {
      letter: "Letter",
      "forwarded-reply": "Forwarded reply",
      "staff-login": "Staff login link",
      "staff-alert": "Staff alert",
    } as Record<string, string>,
    // A complaint can't be undone by staff, only by the person.
    cantReset: "Can't be unblocked: they marked our email as spam.",
    // In the unblock form's field, and its name: the note for the audit log.
    note: "Why unblock it?",
    unblock: "Unblock",
    problemsTitle: "History",
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
    importNow: "Import ControlAI letter now",
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
      after: ", who registered for each, and the calendar's contacts.",
    },
    importNow: "Import Luma now",
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
    // After the counts, how many pages of contacts the run read (runs kept before this was recorded don't say).
    contactPages: (pages: number) => `${pages} pages of contacts read.`,
    // After that, while a full pass over the contacts is part-way through.
    contactsPassGoing: "Still reading every contact: the next runs read the rest.",
    stoppedBy: {
      time: "Stopped: out of time.",
      "rate-limit": "Stopped: near Luma's rate limit.",
      running: "Another run was already going.",
    } as Record<string, string>,
  },
  // The hourly copy of PauseAI's UK members (lib/server/members-import.ts),
  // on the import page.
  members: {
    title: "PauseAI members in the UK",
    intro: {
      before: "Everyone in the UK who joined PauseAI Global through ",
      link: "the join form",
      after:
        " and shared their details with PauseAI UK, or joined before the form asked. Copied from the global team's Airtable.",
    },
    importNow: "Import members now",
    never: "Not imported yet.",
    result: (r: {
      members: number;
      added: number;
      changed: number;
      removed: number;
      supportersAdded: number;
      linked: number;
    }) =>
      `${r.members} members read: ${r.added} added, ${r.changed} changed, ${r.removed} removed; ${r.supportersAdded} new supporters, ${r.linked} linked.`,
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

  // The line every run in the import log starts with (RunBox): how it
  // ended, when, who started it, and for a held MP import, who decided it.
  // A Luma import that left work for later is incomplete in place of done
  // or unchanged.
  runs: {
    status: {
      ok: "Done",
      incomplete: "Incomplete",
      failed: "Failed",
      unchanged: "Unchanged",
      held: "Held",
      applied: "Applied",
      discarded: "Discarded",
    } as Record<string, string>,
    by: (who: string) => `by ${who}`,
    // A failed run's error, as it came.
    error: (error: string) => `Error: "${error}"`,
    decidedBy: (who: string) => `decided by ${who}`,
  },
  check: {
    title: "Members of Parliament against Parliament's list",
    // With a link to the API in the middle.
    intro: {
      before: "Compares the MPs imported from Airtable with ",
      link: "Parliament's Members API",
      after:
        ", and lists where they disagree. Nothing is changed: fix problems in Airtable, and the next import will take the fix.",
    },
    checkNow: "Check MPs now",
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
      after:
        " is marked as signed for the “Regulate AI developers now” campaign here. Never unsigns anyone. This is a deprecated import - should sign/unsign people on MP pages manually here.",
    },
    // The lozenges next to each import's heading: where it's from, and how often it runs.
    airtable: "Airtable",
    web: "Web",
    luma: "Luma",
    nightly: "Nightly",
    hourly: "Hourly",
    oneOff: "One-off",
    checkOnly: "Check only",
    button: "Import signatories now",
    none: "Not imported yet.",
    note: "From Airtable",
    // matched + added is everyone ticked in Airtable; alreadySet is those of them already marked here.
    result: (r: { matched: number; added: number; alreadySet: number }) =>
      `${r.matched + r.added} ticked in Airtable: ${r.matched} matched politicians already here, ${r.added} added as new, ${r.alreadySet} were already marked as signed.`,
  },
  letters: {
    title: "Letters to MPs",
    allStatuses: "All",
    search: "Sender or MP",
    // The Answered filter: whether the MP replied.
    answered: { yes: "Answered", no: "Not answered" },
    // The titles of a letter's own page, and of a supporter's letters' page.
    oneTitle: (mp: string) => `Letter to ${mp}`,
    fromTitle: (name: string) => `Letters from ${name}`,
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
  // The button beside a list's search box; its other filters apply as soon as they're chosen.
  search: "Search",
  // After a list's filters: the list with none.
  resetFilters: "Reset filters",
  // Under a list of more than one page.
  paging: {
    previous: "Previous",
    next: "Next",
  },
  changes: {
    title: "Audit log",
    at: "When",
    actor: "Who",
    action: "What",
    details: "Details",
    // The details as they were logged.
    json: "JSON",
    // In the details: someone no longer here (erased, or never named), by their ID.
    gone: (id: string) => `#${id}`,
    noPermissions: "No permissions",
    // A field with nothing in it, before or after an edit.
    empty: "(none)",
    // Each logged field's name, before its value, where the politician fields' names don't cover it.
    labels: {
      airtableId: "Airtable",
      address: "Address",
      note: "Note",
      reference: "Request",
      reason: "Reason",
      kind: "Kind",
      status: "Status",
      campaign: "Campaign",
      date: "Date",
      from: "Before",
      to: "Permissions",
      permissions: "Permissions",
      pdfUrl: "PDF",
      error: "Error",
    } as Record<string, string>,
    // A held MP import decided, linked to the import's page.
    run: (id: string) => `Import run ${id}`,
    // After each number an import, a sync or an erasure logged: what it counted.
    counts: {
      added: "added",
      removed: "removed",
      changed: "changed",
      matched: "matched",
      alreadySet: "already signed",
      problems: "problems",
      lumaUsers: "Luma people",
      letters: "letters",
      members: "member records",
    } as Record<string, string>,
  },
};

/** Each job in the import log, by the title of its card on the import page and of its own page. */
export const jobTitles: Record<ImportJob, string> = {
  "sync-mps": staffCopy.syncs.title,
  "check-mps": staffCopy.check.title,
  "import-controlai": staffCopy.controlAi.title,
  "import-signatories": staffCopy.import.title,
  "import-luma": staffCopy.luma.title,
  "import-members": staffCopy.members.title,
};
