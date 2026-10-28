// Every word the staff interface (/staff) shows.

import type { Channel } from "@/lib/contact-permissions";
import type { ImportJob } from "@/lib/import-runs";

export const staffCopy = {
  metaTitle: "PauseAI Staff",
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
    // The round button on the sidebar's edge, by its title, that folds it to a strip, and back, for a screen reader.
    fold: "Fold the menu",
    unfold: "Unfold the menu",
    home: "Dashboard",
    accounts: "Staff accounts",
    // The sections the pages are in, in the sidebar.
    sections: {
      supporters: "Supporters",
      politicians: "Politicians",
      admin: "Admin",
    } as Record<string, string>,
    supporters: "Supporters",
    politicians: "Politicians",
    asks: "Asks",
    mailings: "Mailings",
    import: "Import data",
    changes: "Audit log",
    letters: "Letters to MPs",
    supporterEmails: "Blocked emails",
    mpEmails: "Blocked emails",
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
    title: "Dashboard",
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
    // Over the list: how many there are.
    total: (total: number) => `${total} ${total === 1 ? "supporter" : "supporters"}`,
    filters: {
      search: "Name, email or phone",
      // Whether we have a phone number, or an email, for them.
      // The Near filter: a postcode or a town, and how far from it.
      near: "Near",
      nearPlaceholder: "Postcode or town",
      miles: (n: number) => `${n} miles`,
      // In the Near chip, when what was typed couldn't be placed.
      notFound: (text: string) => `${text} (not found)`,
      failed: (text: string) => `${text} (couldn't look it up)`,
      // The Event filter's choices: an event and its day.
      event: "Event",
      eventChoice: (name: string, day: string) => `${name}, ${day}`,
      // The Campaign filter, and its second half: whether they wrote in it.
      campaign: "Campaign",
      wrote: { "": "Wrote", no: "Didn't write" } as Record<string, string>,
      // The other filters are named after their columns.
      // The Contact filter: its topics under their channel's heading, each named short, a phone's with how we'd
      // contact them after it; then in its chip's second half, its answer, as a supporter's page words it.
      channels: { email: "Email", phone: "Phone" } as Record<Channel, string>,
      topics: {
        "luma-calendar": "Luma",
        "pauseai-updates": "PauseAI global",
        "site-forms": "PauseAI UK",
        volunteering: "Volunteering",
        "march-day": "March day",
      } as Record<string, string>,
      ways: { text: "texts", "call-or-text": "calls & texts" } as Record<string, string>,
    },
    columns: {
      name: "Name",
      email: "Email",
      phone: "Phone",
      place: "Place",
      badges: "Activities",
      subscriptions: "Contact",
      firstSeen: "First sign-up",
      lastActive: "Last activity",
      events: "Luma events",
      letters: "Letters to MP",
      // Added by the Event filter: how their registration for the event stands, each event named when there are several.
      registrations: "At the event",
      // Added by the Campaign filter: when they first wrote in the campaign.
      wrote: "Wrote",
    },
    noName: "(no name)",
    // The badges: the sources a supporter is in, and what they did there.
    badges: {
      lumaContact: "Luma contact",
      registered: "Luma events",
      letter: "Wrote to MP",
      member: "Member",
      march: "March sign-up",
    },
    // In the list, a lozenge per topic we'd contact them about, by channel.
    subscriptions: {
      topics: {
        email: {
          "luma-calendar": "Luma email",
          "pauseai-updates": "PauseAI global email",
          "site-forms": "PauseAI UK email",
        },
        phone: {
          "luma-calendar": "Luma texts",
          volunteering: "Volunteer calls & texts",
          "site-forms": "PauseAI UK calls & texts",
          "march-day": "March day texts",
        },
      } as Record<Channel, Record<string, string>>,
      // A yes that an unsubscribe we can't see may have undone.
      unsure: (topic: string) => `${topic} (?)`,
      // Every address they have is blocked.
      blocked: "Blocked",
    },
    sources: {
      luma: "Luma",
      "email-your-mp": "Letter",
      "web-form": "pauseai.info letter",
      "march-2026-11": "March sign-up",
      member: "Member",
    } as Record<string, string>,
    lists: { "luma-calendar": "Luma calendar emails", "pauseai-updates": "PauseAI global updates" } as Record<
      string,
      string
    >,
    // A supporter's page: one box of what we know, then the history.
    detail: {
      emails: "Email",
      phone: "Phone",
      // By a number no topic lets us use.
      unusable: "Don't use",
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
      // From when we first saw them to their last activity.
      active: "Active",
      // The box under the band: a row per topic and address, saying whether we'd contact them about it, and why.
      listsTitle: "Can we contact them?",
      // Folded at the foot of the page, after the history, a table: every value each source record gave, as it gave it.
      everythingTitle: "Everything we hold",
      held: {
        columns: { when: "When", what: "What", value: "Value", from: "From" },
        name: "Name",
        point: "Point",
      },
      permissions: {
        // By channel: each topic's name, and the answers. Unsure is a yes that an unsubscribe we can't see may have undone.
        topics: {
          email: {
            "luma-calendar": "Luma calendar",
            "pauseai-updates": "PauseAI global updates",
            "site-forms": "PauseAI UK updates",
          },
          phone: {
            "luma-calendar": "Luma calendar",
            volunteering: "Volunteering",
            "site-forms": "PauseAI UK updates",
            "march-day": "March day updates",
          },
        } as Record<Channel, Record<string, string>>,
        // By the ways the topic lets us contact them (TOPIC_WAYS), so the answer says the channel. Unsure is a
        // yes an unsubscribe we can't see may have undone.
        answers: {
          email: { yes: "Can email", no: "Can't email", unsure: "Not sure" },
          text: { yes: "Can text", no: "Can't text", unsure: "Not sure" },
          "call-or-text": { yes: "Can call or text", no: "Can't call or text", unsure: "Not sure" },
        } as Record<string, Record<"yes" | "no" | "unsure", string>>,
        // By the address or number, so a screen reader says what it is.
        email: "Email",
        phone: "Phone",
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
          // `form` is the form the box was on, in the words of `forms` below.
          "site-forms": {
            asked: (when: string, form?: string) => `Agreed on ${form}, ${when}`,
            declined: (when: string, form?: string) => `Didn't agree on ${form}, ${when}`,
          },
          volunteering: {
            volunteered: (when: string) => `Gave it when joining as a volunteer, ${when}`,
            "gave-number": (when: string) => `Gave it when joining, not as a volunteer, ${when}`,
            removed: () => "No longer shared with us",
          },
          "march-day": {
            "gave-number": (when: string, form?: string) => `Gave it on ${form} for texts on the day, ${when}`,
            ended: (_when: string, form?: string) => `Gave it on ${form} for texts on the day, which is over`,
          },
        } as Record<string, Record<string, (when: string, form?: string) => string>>,
        // The form a box was on, by form_entries.form; one not here is "their newest form".
        forms: {
          "email-your-mp": "their letter to their MP",
          "web-form": "their pauseai.info letter",
          "march-2026-11": "the march sign-up",
        } as Record<string, string>,
        otherForm: "their newest form",
        // Behind a strip's "?": the topic, what it is, when it's a yes and when a no, and what we can't see, by
        // channel and topic.
        topicTitle: (topic: string) => `Topic: ${topic}`,
        // The labels over when it's a yes and when a no, in the words of the ways the topic allows (TOPIC_WAYS).
        when: {
          email: { yes: "Can email when", no: "Can't email when" },
          text: { yes: "Can text when", no: "Can't text when" },
          "call-or-text": { yes: "Can call or text when", no: "Can't call or text when" },
        } as Record<string, { yes: string; no: string }>,
        caveat: "Note",
        details: {
          email: {
            "luma-calendar": {
              about: "Emails Luma sends to the calendar's contacts.",
              yes: "They're a contact of the calendar: they registered for an event or followed it.",
              no: "They unsubscribed from one of Luma's emails, or were never a contact.",
              caveat:
                "Unfollowing the calendar doesn't stop Luma's emails. Luma tells us of an unsubscribe straight away, but we only see someone resubscribe when we next check, a few hours later.",
            },
            "pauseai-updates": {
              about: "PauseAI newsletters sent via CiviCRM, either by the global team or the UK team.",
              yes: "They ticked “Keep me informed” when they joined, or joined before 30 June 2026, when everyone was signed up.",
              no: "They left “Keep me informed” unticked, or the global team no longer shares their membership with us.",
              caveat: "Unsubscribes are in CiviCRM, which we can't read, so even a yes shows as “Not sure” right now.",
            },
            "site-forms": {
              about: "Emails from PauseAI UK.",
              yes: "They ticked the contact box on the latest of our forms they filled in, such as Email your MP or the march sign-up.",
              no: "They left that box unticked.",
            },
          },
          phone: {
            "luma-calendar": {
              about: "Texts to a number given when registering for a Luma event. We text it, never call it.",
              yes: "The Luma account that gave it is a contact of the calendar.",
              no: "That account unsubscribed from Luma's emails, or was never a contact.",
            },
            "site-forms": {
              about: "Calls and texts from PauseAI UK.",
              yes: "They ticked the contact box on the latest of our forms that has this number. The march sign-up's box says “by email and phone”.",
              no: "They left that box unticked.",
            },
            volunteering: {
              about: "Calls and texts about volunteering.",
              yes: "They gave the number on the PauseAI join form after choosing to volunteer regularly, the only choice it asks a number for, or on the Tally volunteer sign-up form the join page had before 30 June 2026.",
              no: "The global team no longer shares their membership with us.",
              caveat: "A number given with any other choice shows as “Not sure”.",
            },
            "march-day": {
              about: "Texts on the day of the march.",
              yes: "They gave a number on the march sign-up, which asks for one “for text updates on the day”, and the day isn't over yet.",
              no: "The day is over. If they ticked the box on the sign-up, PauseAI UK updates still covers the number.",
            },
          },
        } as Record<Channel, Record<string, { about: string; yes: string; no: string; caveat?: string }>>,
        // One tile in place of the topics', when the address is blocked: in place of a topic, then the answer.
        everyTopic: "Every topic",
        blocked: "Can't email: blocked",
        blockedBecause: {
          hard: (when: string) => `An email to it bounced, ${when}.`,
          complaint: (when: string) => `They marked an email as spam, ${when}.`,
        } as Record<string, (when: string) => string>,
        seeBlocked: "See blocked emails",
      },
      activityTitle: "History",
      // Where they are, and what it's from: their postcode, a city they gave, or an event's place.
      place: "Place",
      placeFrom: {
        postcode: (given: string) => `from their postcode, ${given}`,
        city: () => "from the city they gave",
        event: (given: string) => `from where ${given} was`,
      } as Record<string, (given: string) => string>,
      // In the band at the top: their MP, linked to their page, how they first came, under when they were active,
      // and how many events they registered for and letters they wrote, each linked to its table.
      theirMp: "Their MP",
      firstVia: (source: string) => `first came via ${source}`,
      eventsCounted: (n: number) => (n === 1 ? "event" : "events"),
      lettersCounted: (n: number) => (n === 1 ? "letter to an MP" : "letters to MPs"),
      // Beside the box of what we hold: the events they registered for, and their letters, a table each.
      eventsTitle: "Events",
      noEvents: "No events.",
      lettersTitle: "Letters to MPs",
      noLetters: "No letters.",
      columns: {
        date: "Date",
        event: "Event",
        status: "Registration",
        to: "To",
        campaign: "Campaign",
        letter: "Status",
      },
      // A registration that went through, where the status says nothing more.
      registered: "Registered",
      // Between the MP a letter went to, or who answered it, and its campaign.
      about: "about",
      noActivity: "Nothing yet.",
      kinds: {
        "luma-contact": "Became a contact of the Luma calendar",
        "luma-registered": "Registered for",
        letter: "Wrote to",
        "letter-replied": "Letter answered by",
        "form-entry": "Filled in",
        "member-joined": "Joined PauseAI",
        "opted-out": "Unsubscribed from",
        resubscribed: "Subscribed again to",
      } as Record<string, string>,
      // After a form entry's form: the link they came by, and what Luma said if the form adds people to an event.
      cameFrom: (source: string) => `came by “${source}”`,
      luma: {
        added: "added to Luma",
        skipped: "Luma skipped them",
        "not-configured": "not sent to Luma",
        failed: "Luma failed",
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
    // Beside how many sessions a row has open: ends every one; on your own row, it says they're yours, as it logs you out too.
    endSessions: "End all",
    endMySessions: "End all mine",
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
  // A person's answer to an ask (lib/asks.ts): a letter's, then an event's.
  statuses: {
    signed: "Signed",
    none: "Not signed",
    going: "Going",
    tentative: "Tentatively going",
    meeting_staff: "Staff meeting instead",
    tentative_staff: "Staff tentative",
    declined: "Declined",
    declined_surgery: "Declined, offered a surgery",
    passed_on: "Passed on invite",
    // No answer to an event's invitation.
    noAnswer: "No answer",
  } as Record<string, string>,
  // Whether a notable person is in office.
  personStatuses: {
    in_office: "In office",
    died: "Died",
    retired: "Retired",
    left_office: "No longer in office",
  } as Record<string, string>,
  countries: {
    england: "England",
    scotland: "Scotland",
    wales: "Wales",
    "northern-ireland": "Northern Ireland",
  } as Record<string, string>,
  politicians: {
    title: "Politicians",
    // The search box's label: what it searches.
    search: "Name, constituency, party or email",
    allHouses: "All houses",
    // The filters: in office or not, Airtable's markers, and an answer to an ask.
    status: "Status",
    anyStatus: "Any status",
    // The Email filter's choices: whether we can write to them.
    emailStates: {
      yes: "Has an address",
      none: "No address",
      blocked: "Address blocked",
    } as Record<string, string>,
    flag: "Marked",
    flags: {
      important: "Important target",
      connection: "Personal connection",
      removed: "No longer in Airtable",
      test: "Test politician",
    } as Record<string, string>,
    ask: "Ask",
    // An answer to the ask chosen, in the second half of the ask's chip, its menu named after the ask. With no
    // ask, as a link from the dashboard can have it, its own chip.
    answer: "Answer",
    // In the second half of the ask's chip, before an answer is chosen.
    anyAnswer: "Any answer",
    noAnswer: "Not answered",
    none: "None found.",
    // Over the list: how many there are.
    total: (total: number) => `${total} ${total === 1 ? "politician" : "politicians"}`,
    // Under the list, when a search of those in office finds others too, linked to them all.
    outOfOffice: (n: number) => `${n} ${n === 1 ? "match" : "matches"} found for politicians not in office`,
    // The same, when a search of one house finds no one there, linked to every house.
    otherHouses: (n: number) => `${n} ${n === 1 ? "match" : "matches"} found for politicians in other houses`,
    // The same, when a search finds no one, but would among the test politicians, linked to them.
    tests: (n: number) => `${n} ${n === 1 ? "match" : "matches"} found for test politicians`,
    // Over the nearest names, when a search finds no one.
    closest: "No one matches exactly. These are close matches:",
    // The counts in the list: letters written to them, and how many of those got a reply.
    columns: {
      letters: "Letters",
      replies: "Letters answered",
      status: "Status",
      // Their answer to each ask they've answered.
      asks: "Asks",
      // The first and last letter to them, reply or answer to an ask.
      first: "First activity",
      last: "Last activity",
    },
    // In that column, when they've answered none.
    noAsks: "None",
    noEmail: "No email",
    // On a politician whose address is blocked (/staff/politicians/blocked-emails).
    emailBlocked: "Email blocked",
    // The button on an ask staff record by hand.
    markSigned: "Mark as signed",
    unmarkSigned: "Remove signature",
  },
  fields: {
    name: "Name",
    salutation: "Salutation",
    constituency: "Constituency",
    party: "Party",
    email: "Email",
    house: "House",
  },
  // The mailings page (/staff/mailings): PauseAI's mails to many politicians, and each one's own page.
  mailings: {
    title: "Mailings",
    intro: "Emails PauseAI has sent to many notable people at once.",
    none: "No mailings yet.",
    // Over the list: how many there are.
    total: (n: number) => `${n} ${n === 1 ? "mailing" : "mailings"}`,
    columns: {
      title: "Mailing",
      ask: "Ask",
      sender: "Sender",
      sentAt: "Sent",
      sent: "Sent to",
      skipped: "Skipped",
      bounced: "Bounced",
      replied: "Replied",
      answered: "⁂ Answered",
    },
    // A mailing copied from Airtable, which kept only who got it.
    imported: "From Airtable",
    notRecorded: "Not recorded",
    notSent: "Not sent yet",
    // A mailing's own page.
    fields: {
      ask: "Ask",
      sender: "Sender",
      sentAt: "Sent",
      subject: "Subject",
      attachments: "Attachments",
      source: "Source",
    },
    noAsk: "None",
    textTitle: "The email",
    noText:
      "Text not avilable. This was imported from the Airtable's Emails table, which keeps only who got it and how it was written. It was sent with Gmail, look there.",
    recipientsTitle: "Recipients",
    // Over the recipients: how many; instead of them, when there are none.
    recipientsCount: (n: number) => `${n} ${n === 1 ? "recipient" : "recipients"}`,
    noRecipients: "Nobody yet.",
    recipientColumns: {
      name: "Politician",
      status: "Outcome",
      sentAt: "Sent",
      replied: "Replied",
      how: "Written",
    },
    // How a recipient's letter was written.
    personalised: "personalised",
    asWritten: "as written",
    // Over a mailing's recipients: how many, and how many of those replied.
    counts: (sent: number, replied: number) => `Sent to ${sent}; ${replied} replied.`,
  },
  // A mailing's editor: the letter, with merge fields and parts only some recipients get.
  mailingEditor: {
    bold: "⁂ Bold",
    italic: "⁂ Italic",
    bulletList: "⁂ Bullet point",
    // The toolbar over the letter, for screen readers.
    formatting: "⁂ Formatting",
    // Over the merge fields beside the letter, to click or drag in.
    fieldsHeading: "Fields",
    // On hovering a field or a condition beside the letter.
    dragHint: "⁂ Click to put it at the cursor, or drag it into the letter",
    // On hovering a field some recipients have no value for, which can't be used.
    lacking: (n: number) => `${n} ${n === 1 ? "recipient has" : "recipients have"} none, so it can't be used`,
    // Over the two menus of who a part of the letter is for.
    partsHeading: "Conditional parts",
    // The menu that puts the paragraphs at the cursor in a part only those who gave an answer get.
    addOnlyFor: "+ Only for those who…",
    // The menu that puts them in a part everyone but those who gave an answer gets.
    except: "Except those who…",
    // In the menu of an ask's answers, back to the asks.
    backToAsks: "‹ Asks",
    // Instead of them, when no recipient has answered an ask.
    noConditions: "⁂ No recipient has answered an ask yet.",
    // After each: how many recipients gave that answer.
    covers: (n: number) => `${n}`,
    // On the box round such a part: who gets it.
    onlyForLabel: (who: string) => `Only for those who ${who}`,
    // On the box round a part all but some get: who doesn't.
    exceptLabel: (who: string) => `⁂ Except those who ${who}`,
    // Takes the part at the cursor out of its box, so everyone gets it.
    forEveryone: "⁂ For everyone",
    // The menu typing { opens, of the merge fields.
    pickField: "Insert a field",
    // Each merge field of a mailing to politicians, as its chip says it.
    fields: {
      salutation: "Salutation",
      name: "Name",
      constituency: "Constituency",
      party: "Party",
      house: "House",
    },
    // Who a part is for: those who gave an answer to an ask, as in "Only for those who signed the Frontier AI letter".
    answered: (answer: string, ask: string) => `⁂ ${answer.toLowerCase()} ${ask}`,
  },
  // The pages for writing a mailing, its own page once it's scheduled, and the list of them.
  mailingPages: {
    // Who a mailing is to, when its filter has nothing chosen.
    everyone: "Every politician in office",
    whoLabel: "Who it's for",
    // A search, as a pill of who a mailing is to.
    searchPill: (typed: string) => `⁂ Search "${typed}"`,
    // A mailing's coloured counts.
    counts: {
      sent: "sent",
      replied: "replied",
      bounced: "bounced",
      skipped: "skipped",
      answered: "answered the ask",
    },
    newTitle: "⁂ New mailing",
    // A draft with no subject yet, in the list and as its page's title.
    untitled: "⁂ Untitled draft",
    // At the top of a new mailing, until a channel sends.
    cantSend: "Mailings can't be sent yet. Everything else should work, and you can send a test copy to yourself.",
    // Beside the title: whether the draft is saved.
    saveStates: {
      new: "⁂ Not saved yet: it's kept once you write something.",
      saving: "⁂ Saving…",
      saved: "⁂ Draft saved.",
      conflict:
        "⁂ Someone else has changed this draft since you opened it. Reload the page to see their changes; what you've done since isn't saved.",
      failed: "⁂ Couldn't save. Check your connection: it'll try again at your next change.",
    } as Record<string, string>,
    deleteDraft: "Delete draft",
    // Delete draft after its first press, asking for a second.
    deleteIt: "⁂ Press again to delete it",
    // The numbered sections of a new mailing.
    sections: {
      who: "Who",
      write: "Write",
      preview: "Preview",
      from: "Sent from",
      when: "When",
      send: "Send",
    },
    willGet: (n: number) => `${n} ${n === 1 ? "politician" : "politicians"} will be emailed.`,
    // Who's left out: each part only when there are some.
    leftOut: (found: number, noAddress: number, blocked: number) =>
      `Of the ${found} people the filter found, ${[
        noAddress && `${noAddress} ${noAddress === 1 ? "has" : "have"} no email address`,
        blocked && `${blocked} ${blocked === 1 ? "has an address that's blocked" : "have addresses that are blocked"}`,
      ]
        .filter(Boolean)
        .join(" and ")}, so they're left out.`,
    seeWho: "See who",
    leftOutReasons: {
      "no-address": "no email address",
      blocked: "address blocked",
    } as Record<string, string>,
    changeWho: "Change who",
    unknownFilter: (values: string) =>
      `⁂ The filter has values the site no longer knows (${values}), so it can't be sent until you change who it's for.`,
    subject: "Subject",
    ask: "Ask",
    // Behind the ? beside Ask.
    askHelpLabel: "⁂ What the ask is for",
    askHelp:
      "⁂ What this mailing asks them to do, such as come to an event or sign a letter. Their answers are recorded against the ask, so the mailing's page can count who answered.",
    // The start of a new letter, before the salutation or name.
    greeting: "Dear",
    noAsk: "None",
    letter: "Letter",
    attachments: "Attachments",
    addFiles: "Add files",
    dropFiles: "Drop files here, or",
    // A file's size.
    bytes: (n: number) => `${n} bytes`,
    kilobytes: (n: number) => `${n} KB`,
    megabytes: (n: number) => `${n} MB`,
    removeFile: (name: string) => `⁂ Remove ${name}`,
    tooBig: "⁂ That file is too big: a file can be up to 4MB.",
    // The choice of whose email the preview shows, for screen readers.
    previewAs: "⁂ Whose email to show",
    noOne: "⁂ No one to show: it goes to no one yet.",
    to: "To",
    noSender: "Choose who below",
    // Over the preview: a button for each condition the letter's parts use, pressed for those who meet it.
    casesLabel: "⁂ Show it as for those who…",
    // When no recipient has the answers chosen.
    noOneMix: "⁂ No one it goes to gave these answers. This is the email they'd get.",
    sendTest: "Send this one to me",
    testSent: (address: string) => `⁂ Sent: look in the inbox of ${address}.`,
    // Under the test button, while the letter is empty or only its greeting.
    testNeedsDraft: "Write something first!",
    testFailed: "It couldn't be sent. Try again in a minute.",
    fromLegend: "Whose Gmail to send it from",
    notConnected: "Gmail connection isn't implemented yet.",
    // In the preview, who it's from: the name comes from the Gmail account.
    from: "From",
    fromGmail: (address: string) => `Your Gmail's name <${address}>`,
    // The test copy's sender's name.
    testFromName: "⁂ PauseAI UK mailing test",
    day: "Day",
    hour: "Hour",
    onTheHour: "It will be sent on the hour, UK time.",
    summary: (n: number, from: string | null, when: string | null) =>
      `${n} ${n === 1 ? "email" : "emails"}, from ${from ? `${from}'s Gmail` : "no one yet"}, ${when ? `on ${when}` : "at a time not yet chosen"}.`,
    schedule: (n: number) => `Schedule ${n} ${n === 1 ? "email" : "emails"}`,
    // Why the schedule button can't be pressed.
    problems: {
      "no-subject": "Fill in the subject.",
      "no-letter": "Write the letter.",
      "unknown-filter": "⁂ Its filter has values the site no longer knows.",
      "no-recipients": "There's nobody to send to.",
      "field-lacking": "It uses a field some recipients have no value for.",
      "no-sender": "Choose who to send the message from.",
      "no-time": "Choose what time it will be sent.",
      "time-passed": "You can't send it into the past!",
      "cannot-send": "Sending isn't built yet.",
    } as Record<string, string>,
    // The list of mailings.
    // Under the drafts: how to start a mailing, then a link to the politicians list.
    howToStart:
      "To start a new mailing, filter the politicians list to those it's for, then press Mail these over the list.",
    toPoliticians: "⁂ Go to the politicians",
    drafts: "Drafts",
    comingUp: "Coming up",
    sent: "Sent",
    noDrafts: "No drafts.",
    noneComing: "Nothing scheduled.",
    draftLine: (by: string, n: number) => `${by} · to ${n} ${n === 1 ? "person" : "people"}`,
    comingLine: (by: string, when: string, n: number) => `⁂ ${by} · ${when} · to ${n} ${n === 1 ? "person" : "people"}`,
    stop: "Stop",
    // On the politicians list, beside Download.
    mailThese: (n: number) => `⁂ Mail these ${n}…`,
    useThese: (n: number) => `⁂ Use these ${n} for the draft`,
    // A mailing's own page.
    states: {
      draft: "⁂ Draft",
      scheduled: "⁂ Scheduled",
      sending: "⁂ Sending",
      sent: "⁂ Sent",
      cancelled: "⁂ Stopped",
    } as Record<string, string>,
    sentLine: (when: string, from: string) => `Sent ${when}, from ${from}`,
    sends: (when: string) => `⁂ Sends ${when}`,
    scheduledLine: (n: number, from: string) => `⁂ ${n} ${n === 1 ? "email" : "emails"} from ${from}.`,
    changeTime: "⁂ Change the time",
    saveTime: "⁂ Change it",
    stopScheduled: "⁂ Stop this mailing",
    stopNote: "⁂ Stopping it sends nothing and makes it a draft again, to change and schedule again.",
    sending: (n: number, of: number) => `⁂ ${n} of ${of} sent`,
    stopSending: "⁂ Stop sending",
    sentLabel: "⁂ Sent",
    tabs: {
      all: "⁂ All",
      replied: "⁂ Replied",
      bounced: "⁂ Bounced",
      skipped: "⁂ Skipped",
    },
    tab: (label: string, n: number) => `${label} ${n}`,
    tabsLabel: "⁂ Which recipients",
    emailTitle: "⁂ The email",
    whoTitle: "⁂ Who it was for",
    skipReasons: {
      blocked: "⁂ Skipped: address blocked",
      "left-office": "⁂ Skipped: left office",
    } as Record<string, string>,
  },
  // The asks page: each ask, its kind and date, and how many gave each answer.
  asks: {
    title: "Asks",
    intro: "What we ask notable people to do when writing to them. Make a PR to add a new ask.",
    // Over the list: how many there are.
    total: (n: number) => `${n} ${n === 1 ? "ask" : "asks"}`,
    none: "No asks yet.",
    columns: {
      ask: "Title",
      kind: "Kind",
      date: "Date",
      // Who asks it: supporters, in a campaign's letter, or PauseAI, in a mailing; or both.
      askedBy: "Asked by",
      answers: "Answers",
    },
    kinds: { letter: "Sign letter", event: "Attend event" } as Record<string, string>,
    askedBy: { supporters: "Supporters", pauseai: "PauseAI", controlai: "ControlAI" },
    noAnswers: "No answers yet",
    // Each answer's count links to the politicians who gave it.
    count: (status: string, n: number) => `${status}: ${n}`,
  },
  politician: {
    statusesTitle: "Asks",
    // Over an ask's title, leading into it: who asked them, by staffCopy.asks.askedBy, if we know, and to do what.
    askedThem: (who: string, kind: string) =>
      `${who ? `${who} asked` : "Asked"} them to ${kind === "letter" ? "sign" : "attend"}`,
    // The box at the top of their page: where they came from, and each campaign's status.
    source: "Source:",
    sources: {
      airtable: "Airtable",
      staff: "Added by staff",
      test: "A test MP",
    },
    // A status: who set it and when; the ask's title heads the line. An import's is "from" it.
    setBy: (who: string, when: string) => `set by ${who}, ${when}`,
    fromImport: { airtable: "from Airtable", controlai: "from ControlAI's letter" } as Record<string, string>,
    // The form on an ask staff record: its name, the note's field and what it asks, and Save for an event's answer.
    setStatus: "Set status",
    note: "Note",
    notePlaceholder: "How do you know?",
    // Under the answer to an ask staff record: opens the form to change it.
    edit: "Edit",
    save: "Save",
    // The fields of the box at the top.
    status: "Status",
    country: "Country",
    notes: "Notes",
    // Over how to write to them: their address and salutation.
    writing: "Writing to them",
    // Airtable's markers, as tags by their name.
    importantTarget: "Important target",
    personalConnection: "Personal connection",
    // When their record was no longer in Airtable.
    airtableRemoved: (when: string) => `No longer in Airtable since ${when}`,
    historyTitle: "History",
    // A status set or cleared, in the history: around the ask's name.
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
      // A letter of one of PauseAI's mailings, by its mailing, and how it was written.
      "pauseai-letter": "Email from PauseAI:",
      "add politician": "Added",
      "edit politician": "Details edited",
      "remove politician": "No longer in Airtable",
      "block address": "Address blocked",
      "unblock address": "Address unblocked",
    } as Record<string, string>,
    // At the foot of the page of one whose record has gone from Airtable, and who's had no letters.
    delete: {
      button: "Delete",
      note: "Their record has gone from Airtable and nobody has written to them, so they can be deleted here too.",
      sure: (name: string) => `Delete ${name}, and their answers to asks, for good?`,
      confirm: "Delete for good",
    },
    // On an MP from Airtable, after the source, which links to their record there.
    editInAirtable: ", update there.",
    // On an ask that isn't set by hand: where its statuses come from.
    importedAsk: "set each night by an import",
    personalised: "personalised",
    // Under their name: what they are, in their house, and where for.
    roles: {
      commons: "MP",
      lords: "Member of the House of Lords",
      "scottish-parliament": "MSP",
      senedd: "MS",
      "ni-assembly": "MLA",
      other: "Politician",
    } as Record<string, string>,
    role: (role: string, constituency: string | null, inOffice: boolean) =>
      `${inOffice ? "" : "Formerly "}${role}${constituency ? ` for ${constituency}` : ""}`,
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
      mps: "Politicians' blocked emails",
      supporters: "Supporters' blocked emails",
    },
    intro: "Nothing is sent to these addresses until they're unblocked.",
    // Over the list: how many are blocked, of those the filters find.
    count: (n: number) => `${n} blocked ${n === 1 ? "address" : "addresses"}`,
    // Instead of the table, when no address is blocked, or none of the cause filtered for.
    noBlocks: "No addresses are blocked.",
    // Instead of the history, when nothing has bounced or been complained about.
    noProblems: "Nothing has bounced or been marked as spam.",
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
      // What the email that bounced was, a letter or one of ours.
      sent: "Type of email",
    },
    // The email was a letter: before the name of the politician it was to, the two linked to the letter.
    letterTo: "Letter to",
    // Instead of the type, for an email the site has no record of sending.
    notRecorded: "Not recorded",
    purposes: {
      letter: "Letter",
      "forwarded-reply": "Forwarded reply",
      "staff-login": "Staff login link",
      "staff-alert": "Staff alert",
      "mailing-test": "⁂ Test copy of a mailing",
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
      after: " are marked as having signed “ControlAI's letter to the Prime Minister”. This can't be changed by hand.",
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
    // After that, the postcodes and towns looked up at postcodes.io for where supporters are (runs kept before this was recorded don't say).
    places: (p: { postcodes: number; towns: number }) => `${p.postcodes} postcodes, ${p.towns} towns looked up.`,
    // After that, when postcodes.io failed partway: the next run carries on.
    placesFailed: "Postcodes.io failed: the next run carries on.",
    stoppedBy: {
      time: "Stopped: out of time.",
      "rate-limit": "Stopped: near Luma's rate limit.",
      running: "Another run was already going.",
    } as Record<string, string>,
  },
  // The hourly copy of PauseAI's UK members (lib/server/members-import.ts),
  // on the import page.
  // PauseAI's emails to politicians, from Airtable's Emails table.
  pauseaiEmails: {
    title: "PauseAI's emails to politicians",
    intro: {
      before: "Copies each email that PauseAI has sent a politician, of every year, from the ",
      link: "Emails table in Airtable",
      after: ". Only transfers known ones, the import code needs updating if a new mailing is added.",
    },
    importNow: "Import emails now",
    never: "Not imported yet.",
    result: (r: { read: number; added: number; waiting: number; noPolitician: number; unplaced: unknown[] }) =>
      `${r.read} emails read: ${r.added} added, ${r.waiting} waiting for their politician, ${r.noPolitician} with no politician, ${r.unplaced.length} with no mailing we know.`,
    // The emails with no mailing we know, by their Airtable record, and the boxes they have ticked.
    unplaced: "No mailing we know",
    noBoxes: "no box ticked",
  },
  // The one-off import of the letters sent through pauseai.info's old form.
  webForm: {
    title: "Letters from pauseai.info's old write to MP form",
    intro: {
      before: "Transfer letters that supporters sent politicians through pauseai.info, reading from ",
      link: "Web form emails table in Airtable",
      after: ", making their senders become supporters. It doesn't copy the letters' text.",
    },
    importNow: "Import the letters",
    never: "Not imported yet.",
    result: (r: { read: number; imported: number; skipped: number; alreadyHere: number; noPolitician: number }) =>
      `${r.read} letters read: ${r.imported} imported, ${r.skipped} spam, invalid or unsent, ${r.alreadyHere} already here, ${r.noPolitician} to a politician not here.`,
  },
  // The one-off import of the meetings for Go to Parliament.
  goToParliament: {
    title: "Go to Parliament event, 20 October 2026",
    intro: {
      before: "Stores in each MP's record their answer to “Constituent meetings at Parliament”. Reads from the ",
      link: "Go to Parliament table in Airtable",
      after: ".",
    },
    importNow: "Import the meetings",
    never: "Not imported yet.",
    result: (r: { guests: number; mps: number; added: number; changed: number; notFound: number }) =>
      `${r.guests} guests with a meeting, with ${r.mps} MPs: ${r.added} statuses set, ${r.changed} changed, ${r.notFound} MPs not here.`,
  },
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
    title: "Politicians from Airtable",
    // With a link to the table in the middle.
    intro: {
      before: "Every politician in every body is copied from the ",
      link: "UK Parliamentarians table in Airtable",
      after:
        ", except the Airtable test MPs. Stores their answers to “Frontier AI letter to the Prime Minister”, “DeepMind letter to Sir Demis Hassabis”, “ControlAI's campaign statement” and “Edinburgh conference”. Runs that change lots of data are held for checking.",
    },
    /** The test MPs (lib/test-mps.json) aren't in Airtable; every import adds any that are missing. */
    testMps: "Each import also adds our own test MPs, who aren’t in Airtable, if any are missing.",
    syncNow: "Import politicians now",
    none: "Not yet imported.",
    added: "Added",
    // Those whose record is no longer in Airtable.
    removed: "Gone from Airtable",
    changed: "Changed",
    // A record whose name changed, which may be Airtable reusing it for someone new: from, to.
    renamed: "Renamed",
    // The statuses it set from Airtable's tick boxes, after the counts of people.
    statuses: (s: { added: number; changed: number; removed: number }) =>
      `Statuses: ${s.added} set, ${s.changed} changed, ${s.removed} taken away.`,
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
    // The page, with every import: the politicians from Airtable, ControlAI's
    // letter from the web, Luma and the members.
    pageTitle: "Import data",
    // The lozenges next to each import's heading: where it's from, and how often it runs.
    airtable: "Airtable",
    web: "Web",
    luma: "Luma",
    nightly: "Nightly",
    hourly: "Hourly",
    oneOff: "One-off",
    checkOnly: "Check only",
  },
  letters: {
    title: "Letters to MPs",
    // Over the list: how many there are.
    total: (total: number) => `${total} ${total === 1 ? "letter" : "letters"}`,
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
      // PauseAI's letters of a mailing written here, before and instead of sending.
      scheduled: "⁂ Scheduled",
      cancelled: "⁂ Stopped",
      skipped: "⁂ Skipped",
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
    // Beside a letter sent through pauseai.info's old form, copied from Airtable.
    imported: "pauseai.info",
  },
  // The button beside a list's search box; its other filters apply as soon as they're chosen.
  search: "Search",
  // After a list's filters: the list with none.
  resetFilters: "Clear filters",
  // A list's filters: the × in the search box, + Filter, which offers the filters not on, and on a filter's
  // chip, the way to take it off.
  filters: {
    clearSearch: "Clear the search",
    add: "+ Filter",
    // The other half of + Filter: adds a choice the list leaves out. Its menu's heading, and a left-out choice's chip.
    except: "Except",
    exceptHeading: "Leave out those with",
    notChip: (label: string, value: string) => `${label}: not ${value}`,
    // In a chip's menu: the same choice, left out instead of found, or found instead of left out.
    exceptInstead: "Except this instead",
    onlyInstead: "Only this instead",
    remove: "Remove",
    // Over a long list of a filter's choices: narrows them as it's typed in.
    narrow: "Search these",
    // A place filter's distance, for a screen reader.
    within: "Within",
  },
  // Under a list of more than one page.
  paging: {
    previous: "Previous",
    next: "Next",
    // The paging's name, for a screen reader.
    label: "Pages",
    // A page's number, for a screen reader.
    page: (n: number) => `Page ${n}`,
    // On a phone, between Previous and Next.
    of: (page: number, pages: number) => `Page ${page} of ${pages}`,
    // Under the list: the rows on this page, of how many.
    range: (from: number, to: number, total: number) => `${from}–${to} of ${total}`,
  },
  // Over a list, after its count: the rows on this page, when there's more than one; then its downloads, of every page.
  lists: {
    showing: (from: number, to: number) => `showing ${from}–${to}`,
    // The button that opens the downloads, of every page, and each format in its menu.
    download: "Download",
    formats: { csv: "CSV, for a spreadsheet", json: "JSON, for an agent", vcf: "vCard, for WhatsApp" },
  },
  changes: {
    title: "Audit log",
    // Over the list: how many entries there are.
    total: (n: number) => `${n} ${n === 1 ? "entry" : "entries"}`,
    none: "Nothing logged yet.",
    // The column of the day, before the time.
    day: "Date",
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
      formEntries: "form entries",
      letters: "letters",
      members: "member records",
    } as Record<string, string>,
  },
};

/** Each job in the import log, by the title of its card on the import page and of its own page. */
export const jobTitles: Record<ImportJob, string> = {
  "sync-politicians": staffCopy.syncs.title,
  "sync-emails": staffCopy.pauseaiEmails.title,
  "import-web-form-letters": staffCopy.webForm.title,
  "import-go-to-parliament": staffCopy.goToParliament.title,
  "check-mps": staffCopy.check.title,
  "import-controlai": staffCopy.controlAi.title,
  "import-luma": staffCopy.luma.title,
  "import-members": staffCopy.members.title,
};
