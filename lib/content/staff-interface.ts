// Every word the staff interface (/staff) shows.

import type { Channel } from "@/lib/contact-permissions";
import { letterEditorCopy } from "@/lib/content/letter-editor";
import type { ImportJob } from "@/lib/import-runs";

/**
 * What can't be done to an ask, said on its form and, the same words, when a
 * save or a delete is refused for it (staffCopy.asks).
 */
const askLimits = {
  kindFixed: "Kind can't be changed now, as politicians have answered it.",
  fixed: "Campaigns hard-coded on the site use this ask, so you can't change it here.",
  notDeletable: "Asks can't be deleted while answers, campaigns or mailings refer to them.",
};

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
  // Any Delete pressed twice (DeleteTwice), after its first press, asking for a second.
  deleteIt: "Press again to delete it",
  // The same, short, where there's little room (a note's buttons).
  deleteItShort: "Confirm?",
  // The dev login's box under the login card, in a fixture build only.
  devLogin: {
    // Before what a shared inbox's address is, in the dev login.
    lettersInbox: "Letters inbox",
    policyInbox: "Policy inbox",
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
      events: "Events",
      politicians: "Politicians",
      admin: "Admin",
      // Over your address, which leads to your own page.
      profile: "Your account",
    } as Record<string, string>,
    supporters: "Supporters",
    politicians: "Politicians",
    asks: "Asks",
    mailings: "Mailings",
    events: "Events",
    import: "Import data",
    changes: "Audit log",
    campaigns: "Campaigns",
    oneOff: "One-off emails",
    sentEmails: "Sent emails",
    // Beside a page the staff member first saw in the last 3 days.
    newTag: "new",
    supporterEmails: "Blocked emails",
    mpEmails: "Blocked emails",
    logout: "Log out",
  },
  // A letter in Gmail, by its page's heading: a button that copies a
  // search for it, then says to paste it, and where.
  findInGmail: {
    copy: "Copy Gmail search",
    copied: "Copied!",
    // The × that closes the note, as a screen reader names it.
    close: "Close",
    // Then, in the note under it, what to do, in bold, "paste" stressed; under that, where.
    next: { before: "Next, ", stressed: "paste", after: " into Gmail search." },
    where: (mailbox: string) => `You must be in an inbox that can see ${mailbox}'s mail.`,
    // A supporter's letter sent before policy@ was a Gmail account, when it was a Google Group.
    policyGroup: "You must be in an inbox that got policy@'s mail when it was sent, such as Joseph's.",
    // A letter of PauseAI's copied from Airtable, which kept no record of the Gmail it went from.
    whereUnknown: "You must be in an inbox that sent it. Most of these went from Joseph's.",
  },
  // One of PauseAI's letters, and the replies in its thread.
  letterThread: {
    title: "Letter and replies",
    // An imported letter, whose text Airtable didn't keep.
    noText: "Text not available, as sent from Airtable.",
    // Over the text of a letter that's rebuilt from replies quoting others like it.
    approximate:
      "Approximate: rebuilt from replies quoting other letters in this mailing. This isn't what they received, but it was probably much like this.",
    // A supporter's letter, whose text and replies the site doesn't keep.
    supporterNoText: "Text not available, the site does not keep supporters' letters.",
    noReplies: "No replies yet.",
    unreadable: "This message couldn't be read.",
    // Over each message, as an email shows them.
    headers: { from: "From", to: "To", cc: "Cc", date: "Date", subject: "Subject" },
  },
  // Your own page: your sessions and your Gmail.
  me: {
    title: "Your account",
    sessionsTitle: "Where you're logged in",
  },
  // Connecting a staff member's Gmail, on their own page and in a mailing's Sent from.
  gmail: {
    title: "Let staff send mailings from your Gmail",
    // The heading once it's connected.
    connectedTitle: "Staff can send mailings from your Gmail",
    // The same two, logged in as the letters inbox, which sends supporters' letters to MPs and nothing else.
    lettersInboxTitle: "Send supporters' letters to MPs from this Gmail",
    lettersInboxConnectedTitle: "Supporters' letters to MPs go from this Gmail",
    // What connecting it means, said before it goes to Google: a line, then a bullet each.
    intro: "Usually this is a shared account rather than a person's own: log in here as it, then connect it.",
    explain: [
      "Mailings can go from its address, are kept in its Sent mail, and replies come back to it.",
      "The site reads only those replies and bounces, and never deletes or changes anything.",
    ],
    limit: (limit: string) => `At most ${limit} a day, leaving room for the account's other email.`,
    // The same, logged in as the letters inbox, which sends supporters' letters to MPs and nothing else.
    lettersInboxExplain: [
      "Supporters' letters to MPs go from proxy addresses on it, and the MPs' replies come back to it, to be relayed to the supporters, and their answers back.",
      "The site reads all of its mail, labels and archives what it has handled, and moves an erased supporter's mail to Trash.",
    ],
    lettersInboxLimit: (limit: string) =>
      `At most ${limit} a day, letters, copies and relays together, under Google's 2,000.`,
    connect: "Connect Gmail",
    disconnect: "Disconnect Gmail",
    connected: (when: string) => `Connected ${when}.`,
    notConnected: "Your Gmail isn't connected.",
    sentToday: (sent: number, limit: string) => `${sent} of today's ${limit} emails sent.`,
    // After coming back from Google, or disconnecting.
    outcomes: {
      connected: "Your Gmail is connected. All staff will be able to send mailings from it now.",
      // The same, for the letters inbox, which sends supporters' letters and nothing else.
      connectedLettersInbox:
        "The letters inbox is connected. Supporters' letters to MPs go from it now, and replies are relayed through it every 5 minutes.",
      refused: "Gmail wasn't connected, as you didn't allow it.",
      failed: "Gmail couldn't be connected. Try again.",
      disconnected: "Your Gmail is disconnected.",
    } as Record<string, string>,
    // Back from Google having chosen an account other than the one logged in here, `me`.
    otherAccount: (me: string) =>
      `That Google account does not have the same email ${me} as your PauseAI UK staff account. Either pick a different Google account, or log in here with the same email.`,
  },
  // Your sessions, on your own page (/staff/me): one row each, and a way to end them all.
  sessions: {
    intro: "You're logged into the PauseAI Staff pages on these devices.",
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
          "That's a lot of MPs, so please check it, and apply or discard it. Fix any problems in Airtable.",
        decide: "Review import",
        blockedMp: (name: string) => `${name}'s email is bouncing`,
        blockedMpDetail: "Find a working email for this MP if it has changed, or unblock if working now.",
        openMp: "Fix MP email",
        failedImport: (job: string) => `Import '${job}' failed`,
        failedImportDetail: (error: string, at: string) => `Error: "${error}" · ${at}`,
        seeRun: "See failed run",
        // The newest read of Gmail found mail in the letters inbox it couldn't handle: when, and where it waits.
        lettersInboxDetail: (at: string) =>
          `Open each in Gmail and deal with it by hand: forward it, answer it, or leave it. Found ${at}.`,
        // Its button, to the run's page, which lists each with why it wasn't relayed and a link to it in Gmail.
        lettersInboxButton: "See emails",
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
      none: "No",
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
      // The MP filter's choices: an MP and their constituency.
      mpChoice: (name: string, constituency: string) => `${name}, ${constituency}`,
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
        // The Events table's: when they registered or became host, their part in it, which event, and when it is.
        eventDate: "Event date",
        event: "Event",
        status: "Role",
        joined: "Joined",
        to: "To",
        campaign: "Campaign",
        letter: "Status",
        sent: "Sent",
      },
      // A registration that went through, where the status says nothing more.
      registered: "Registered",
      // In the Events table's status column, for an event they hosted.
      host: "Host",
      // Between the MP a letter went to, or who answered it, and its campaign.
      about: "about",
      noActivity: "Nothing yet.",
      kinds: {
        "luma-contact": "Became a contact of the Luma calendar",
        "luma-registered": "Registered for",
        "luma-hosted": "Became host for",
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
    // The table's last row: everyone else at pauseai.uk, who can log in with no permissions; and across the rest of
    // the row, in grey, what that means.
    everyone: "*@pauseai.uk",
    everyoneNote: "Anyone with a @pauseai.uk address can log in with no extra permissions.",
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
    // At the top right, the button that opens the field for the address of someone new (its label, read aloud) and its
    // button, which adds them as a row, with no permissions.
    addStaff: "Add staff",
    // The field's label, then what's in it until something is typed.
    addLabel: "Email:",
    addTitle: "@pauseai.uk email address",
    add: "Add",
    // In a row's Permissions cell, after the permissions it has: the button that opens a box for each, and the form's
    // buttons.
    edit: "Edit",
    editLabel: (email: string) => `Edit ${email}'s permissions`,
    save: "Save",
    cancel: "Cancel",
    // At a row's right, pressed twice; and just after, over the table till its × closes it, what it leaves them.
    remove: "Remove",
    removeNote: "They will still be able to log in with basic permissions, unless their Gmail is disabled too.",
    closeRemoved: "Close",
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
    going: "Going",
    tentative: "Tentatively going",
    meeting_staff: "Staff meeting instead",
    tentative_staff: "Staff tentative",
    declined: "Declined",
    declined_surgery: "Declined, offered a surgery",
    passed_on: "Passed on invite",
    // No answer to an ask, of any kind.
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
    // A filter: those a mailing about an ask has gone or is going to.
    mailed: "Mailed about",
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
  // The events page (/staff/events): our events on Luma, as the Luma import has them, and who on staff owns each.
  events: {
    title: "Events",
    // At the page's top right, in small grey print, as on a politician's page: where the events come from, linking to
    // the Luma import's page.
    source: { label: "Source:", link: "Luma" },
    none: "No events yet.",
    // The tabs over the list, and their name, for a screen reader: those still to come, soonest first, and those
    // past, latest first.
    tabs: { label: "When", future: "Future", past: "Past" },
    // Over the list: how many the tab and filters find; and what it says when they find none.
    total: (n: number) => `${n} ${n === 1 ? "event" : "events"}`,
    noneFound: "No events match.",
    // Under it, when a search finds none, but would among those taken off Luma, linked to them.
    removedMatches: (n: number) => `${n} ${n === 1 ? "match" : "matches"} found for events taken off Luma`,
    // The table's headings; the owner's and Google Doc's are `owner` and `doc` below. Going is how many registered
    // and were approved. Hosts are its hosts on Luma, for staff who see supporters.
    columns: { when: "When", name: "Event", tags: "Tags", place: "Place", going: "Going", hosts: "Hosts" },
    // A host Luma has no name for, in the Hosts column.
    noHostName: "No name on Luma",
    // The list's search box, and its filters but Owner's: each Luma tag; each city, and Online; and taken off Luma
    // (`removed`), which finds only those, as they're left out otherwise.
    filters: {
      search: "Name, host or email",
      tag: "Tag",
      place: "Place",
      removed: { yes: "Yes" } as Record<string, string>,
    },
    // Where an event online is, in the Place column and filter.
    online: "Online",
    // An event gone from our Luma calendar, kept for its history.
    removed: "Taken off Luma",
    // No owner: in red, with a warning, on one coming up, as someone must take it; the edit form's select's first choice.
    noOwner: "No owner",
    // An event's Google Doc: the link to it, in its column after the owner; with none, in red, with a warning,
    // on one coming up, as for no owner.
    doc: "Google Doc",
    noDoc: "No doc",
    // The button at a row's right, and its name for a screen reader, which opens the form to change its owner and doc.
    edit: "Edit",
    editLabel: (event: string) => `Edit ${event}`,
    // The edit form's fields and buttons.
    owner: "Owner",
    docField: "Google Doc",
    // In the empty box: the start of the link it takes (Google Drive's are taken too).
    docPlaceholder: "https://docs.google.com/…",
    save: "Save",
    // After a save that emailed anyone, in a note under the event: whom, and why. Its × closes it.
    emailed: (to: string[], owner: string) =>
      `Emailed ${to.join(" and ")} to let them know ${owner} now owns this event.`,
    closeEmailed: "Close",
    cancel: "Cancel",
    // The email when an event's owner changes: to the new owner, whoever chose them, copied to the one before, saying who
    // gave it to them and from whom; or, when the import gives events their owners by the rules, to each new owner,
    // listing them.
    ownerEmail: {
      subject: (n: number, first: string, owner: string) =>
        n === 1 ? `You're now owner for ${first}, ${owner}` : `You're now owner for ${n} events, ${owner}`,
      // `link`: the events page, showing the event, or for several, the owner's events.
      body: ({
        events,
        owner,
        previous,
        by,
        link,
      }: {
        events: { name: string; when: string; url: string }[];
        owner: string;
        previous: string | null;
        by: string | null;
        link: string;
      }) =>
        `${by ? `You're now the owner of this event, ${owner}. ${by === owner ? "You took it on" : `${by} gave it to you`}${previous ? `, from ${previous}` : ""}.` : `You're now the owner of ${events.length === 1 ? "this event" : "these events"}, ${owner}, by the rules for who owns which events.`}\n\n${events.length === 1 ? "This event in the staff interface:" : "Your events in the staff interface:"}\n${link}\n\n${events
          .map((event) => `${event.name}\n${event.when}\n${event.url}`)
          .join(
            "\n\n",
          )}\n\nAs the owner, you make sure the event is exceptional:\n- Be chronically early: arrive before anyone else to get everything ready, and leave last\n- Spot early what could go wrong, like an entrance that's hard to find\n- Make sure enough people come\n- Have everyone leave feeling it was better than they expected`,
    },
  },
  mailings: {
    title: "Mailings",
    intro: "Emails PauseAI sends to many notable people at once.",
    none: "No mailings yet.",
    // Over the list: how many there are.
    total: (n: number) => `${n} ${n === 1 ? "mailing" : "mailings"}`,
    columns: {
      title: "Mailing",
      ask: "Ask",
      sender: "Sender",
      sentAt: "Sent",
      sent: "Sent to",
      replied: "Replied",
      answered: "Answered",
    },
    // A mailing copied from Airtable, which kept only who got it.
    imported: "From Airtable",
    // The chips in an imported mailing's text.
    importedFields: {
      greeting: "Greeting",
      own: "Their own paragraph",
      colleagues: "How many colleagues",
    } as Record<string, string>,
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
    noText: "Text not available, as sent from Airtable. Open a letter under Recipients to copy a Gmail search for it.",
    recipientsTitle: "Recipients",
    // Over the recipients: how many; instead of them, when there are none.
    recipientsCount: (n: number) => `${n} ${n === 1 ? "recipient" : "recipients"}`,
    noRecipients: "Nobody yet.",
    recipientColumns: {
      name: "Politician",
      status: "Status",
    },
    // A recipient's letter that was personalised, which Airtable kept.
    personalised: "personalised",
  },
  // A mailing's editor: the letter, with merge fields and parts only some recipients get.
  mailingEditor: {
    // Bold, italic, links, bullets and quotes, as in a supporter's letter.
    ...letterEditorCopy,
    // The toolbar over the letter, for screen readers.
    formatting: "Formatting",
    // Over the merge fields beside the letter, to click or drag in.
    fieldsHeading: "Fields",
    // On hovering a field or a condition beside the letter.
    dragHint: "Click to insert it where the cursor is, or drag it to where you want in the letter",
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
    noConditions: "None available, because no recipient has answered an ask.",
    // After each: how many recipients gave that answer.
    covers: (n: number) => `${n}`,
    // On the box round such a part: who gets it.
    onlyForLabel: (who: string) => `Only for those who ${who}`,
    // On the box round a part all but some get: who doesn't.
    exceptLabel: (who: string) => `Except those who ${who}`,
    // Takes the part at the cursor out of its box, so everyone gets it.
    forEveryone: "For everyone",
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
    // Who a part is for: those who gave an answer to an ask, after "Only for those who", as in
    // "Only for those who signed the Frontier AI letter". Each answer's words, then the ask's title.
    answerWords: {
      signed: "signed",
      going: "are going to",
      tentative: "are tentatively going to",
      meeting_staff: "are sending staff to meet us instead of",
      tentative_staff: "may send staff to",
      declined: "declined",
      declined_surgery: "declined, offering a surgery instead of",
      passed_on: "passed on",
    } as Record<string, string>,
    answered: (words: string, ask: string) => `${words} ${ask}`,
  },
  // The pages for writing a mailing, its own page once it's scheduled, and the list of them.
  mailingPages: {
    // Who a mailing is to, when its filter has nothing chosen.
    everyone: "Every politician in office",
    whoLabel: "Who it's for",
    // A search, as a pill of who a mailing is to.
    searchPill: (typed: string) => `Search "${typed}"`,
    // A mailing's counts.
    counts: {
      sent: "sent",
      replied: "replied",
      failed: "failed",
      stopped: "stopped",
      answered: "answer",
    },
    // A new mailing's page's title, and the mailings page's button that starts one.
    newTitle: "New mailing",
    // A draft with no subject yet, in the list and as its page's title.
    untitled: "Untitled draft",
    // At the top of a new mailing, until a channel sends.
    cantSend: "Mailings can't be sent yet. Everything else should work, and you can send a test copy to yourself.",
    // Beside the title: whether the draft is saved.
    saveStates: {
      conflict:
        "Sorry! Someone else has changed this draft since you opened it, so what you've done hasn't been saved. Reload the page to see their changes.",
    } as Record<string, string>,
    // In the window's corner, whether the draft is saved.
    savePill: {
      saving: "Saving…",
      saved: "Saved",
      failed: "Couldn't save. Make another change to try saving again.",
      conflict: "Not saved because someone else changed the same draft!",
    } as Record<string, string>,
    deleteDraft: "Delete draft",
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
    // Of those ticked, or for a mailing from before ticks, those its filter found.
    leftOut: (found: number, noAddress: number, blocked: number, ticked = false) =>
      `${ticked ? `Of the ${found} ticked` : `Of the ${found} ${found === 1 ? "person" : "people"} the filter found`}, ${[
        noAddress && `${noAddress} ${noAddress === 1 ? "has" : "have"} no email address`,
        blocked && `${blocked} ${blocked === 1 ? "has an address that's blocked" : "have addresses that are blocked"}`,
      ]
        .filter(Boolean)
        .join(" and ")}, so they'll be left out.`,
    leftOutReasons: {
      "no-address": "no email address",
      blocked: "address blocked",
    } as Record<string, string>,
    changeWho: "Change who",
    // The same, while no one's ticked yet.
    chooseWho: "Choose who",
    unknownFilter: (values: string) =>
      `The saved filter has values that are no longer supported (${values}), you need to change it before carrying on.`,
    subject: "Subject",
    ask: "Ask",
    // Under the ask: where to add a new one, around a link to the asks page's form, which comes back here.
    newAsk: { before: "You can add a new ask on the ", link: "Asks page", after: "." },
    // Behind the ? beside Ask.
    askHelpLabel: "Help about what an ask is",
    askHelp:
      "What this mailing asks the recipients to do, such as come to an event or sign a letter. These are recorded either manually by staff, or with an import job.",
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
    removeFile: (name: string) => `Remove ${name}`,
    tooBig: "That file is too big - a file can be up to 4MB.",
    // When uploading a file fails, such as the connection dropping.
    attachFailed: "That file couldn't be added. Try again.",
    // Over the preview: before a button for each condition the letter's parts use, then over the choice of whose email it shows.
    findRecipient: "Find recipient who:",
    chooseRecipient: "Choose recipient:",
    noOne: "There are no recipients to choose from.",
    to: "To",
    noSender: "Choose who below",
    // When no recipient has the answers chosen.
    noOneMix: "No preview, because none of the recipients match the answers you picked above.",
    // The test copy: the address it goes to, yours to start with, and the button.
    sendTestTo: "Send a test copy to",
    sendTest: "Send test",
    // Under it: how the test copy goes, so you know where to look for it.
    testVia: (gmail: string | null) =>
      gmail
        ? `Sends from ${gmail}'s Gmail, so copies also show in Sent.`
        : "Sends from our own mail service, so it won't be in any Gmail's Sent.",
    testSent: (address: string) => `Sent to ${address}.`,
    // Under the test button, while the letter is empty or only its greeting.
    testNeedsDraft: "Write something first!",
    testFailed: "It couldn't be sent. Try again in a minute.",
    // The first entry of a list while nothing in it is chosen.
    choose: "Choose…",
    fromLegend: "Gmail account",
    fromNameLabel: "Name",
    // A sender, in Sent from's list: their address, and how many more it can send today.
    // Your own address, before your Gmail's connected.
    senderNotConnected: (address: string) => `${address} (not connected)`,
    notConnected: "This Gmail isn't connected. Only its owner can connect it, from their own page.",
    // With no Gmail connected, in place of the choice of one.
    noSenders: "No Gmail is connected yet, so nothing can be sent.",
    // Under the choice of Gmail while yours isn't connected, to your account page, where it's connected.
    connectOne: "Add your Gmail",
    // In the preview, who it's from: the name comes from the Gmail account.
    from: "From",
    // The test copy's sender's name.
    testFromName: "PauseAI UK mailing test",
    day: "Day",
    hour: "Hour",
    // An hour overnight, when no mailing starts, that a mailing was due at already: the hour, and when it goes.
    goesAt: (hour: string, sends: string) => `${hour} (goes at ${sends})`,
    summary: (n: number, from: string | null, when: string | null) =>
      `${n} ${n === 1 ? "email" : "emails"}, from ${from ? `${from}'s Gmail` : "no one yet"}, ${when ? `on ${when}` : "at a time not yet chosen"}.`,
    schedule: (n: number) => `Schedule ${n} ${n === 1 ? "email" : "emails"}`,
    // Why the schedule button can't be pressed.
    problems: {
      "unknown-filter": "The filter has values that have changed or are no longer supported.",
      "no-recipients": "There's nobody to send to.",
      "no-subject": "Fill in the subject.",
      "no-letter": "Write the letter.",
      "field-lacking": "It uses a field some recipients have no value for.",
      "no-sender": "Choose who to send the message from.",
      "not-connected": "The Gmail you've chosen to send from isn't connected.",
      "too-many": "This mailing is to more people than one Gmail can send to in a day.",
      "no-time": "Choose what time it will be sent.",
      "time-passed": "You can't send it into the past!",
      "cannot-send": "Sending isn't built yet.",
    } as Record<string, string>,
    // The list of mailings: the heading over those not sent yet.
    comingUp: "Coming up",
    // Choosing who a mailing is for on the politicians list: at the top, for a new mailing or for a draft named by its title,
    // and under that what to do.
    choosingNew: "Choose who the new mailing goes to",
    choosingDraft: (title: string) => `Change who the mailing “${title}” goes to`,
    // What to do, for a draft and for a new mailing. Not on a phone, where the title is enough.
    choosingHow: "Tick each person it's for. The mailing is immediately updated as you tick.",
    choosingHowNew: "Tick each person it's for. Then press the “Write to these” button.",
    // Beside it, for a new mailing: deleting it.
    cancelNew: "Cancel",
    backToDraft: "Back to the draft",
    // The tab after the houses, showing only those ticked.
    pickedTab: "Ticked",
    // The tab after it, once names are pasted: who each line found.
    pastedTab: "Paste names",
    // A row's tick box, and the one in the heading that ticks everyone the filters find, on every page.
    tick: (name: string) => `Tick ${name} for the mailing`,
    tickAll: (n: number) => `Tick all ${n} found, on every page`,
    // In the bar at the foot: the button that opens a box for names, one a line, and the box's button.
    pasteNames: "Paste names…",
    pasteLabel: "Paste names, constituencies or emails. You can just copy and paste text from a whole page.",
    pasteTick: "Find these",
    // Under it after a paste, the politicians list's table, a row for each person a line found, with their
    // tick box, and last the reason they're there: by their name, more than one match, or only near it.
    pastedTitle: "Names pasted",
    pastedTickAll: (n: number) => `Tick all ${n} found`,
    pastedFound: "Reason",
    pastedBy: {
      name: "Their name",
      constituency: "Their constituency",
      email: "Their email",
      words: "Part of their name or constituency",
    } as Record<string, string>,
    pastedSome: "More than one match: tick the right one",
    pastedNone: "No exact match: nearest name",
    // Under it: how many lines found no one; or, if none did, that.
    pastedSkipped: (n: number) => `Couldn't find a politician on ${n} ${n === 1 ? "line" : "lines"}.`,
    pastedNoOne: "None found.",
    // In the bar at the foot of the list: how many are ticked, and the button on to the draft.
    choosingCount: (n: number) => `${n} ticked for the mailing`,
    seeTicked: "See them",
    untickAll: "Clear all ticks",
    noneTicked: "Tick who it's for",
    writeToThese: (n: number) => (n === 1 ? "Write to this one" : `Write to these ${n}`),
    // The same, greyed, while no one's ticked.
    writeToNone: "Write to these",
    useThese: (n: number) => (n === 1 ? "Use this one" : `Use these ${n}`),
    // Who a mailing's for, when everyone a filter found was ticked: that filter, the day, how many, then those
    // added and taken off since, by name. With more changes than a few, or no such filter, the names ticked.
    pickedFrom: (when: string, n: number) => `as found on ${when} (${n})`,
    pickedPlus: (name: string) => `plus ${name}`,
    pickedExcept: (name: string) => `except ${name}`,
    pickedNone: "No one ticked yet",
    pickedMore: (n: number) => `and ${n} more`,
    // A mailing's own page.
    states: {
      draft: "Draft",
      scheduled: "Scheduled",
      sending: "Sending",
      sent: "Sent",
      cancelled: "Stopped",
    } as Record<string, string>,
    sends: (when: string) => `Sends on ${when}`,
    scheduledLine: (n: number, from: string) => `${n} ${n === 1 ? "email" : "emails"} from ${from}.`,
    changeTime: "Change the time",
    saveTime: "Change it",
    // Takes a scheduled mailing back to a draft, sending nothing.
    unschedule: "Unschedule",
    stopSending: "Stop sending",
    sentLabel: "Sent",
    tabs: {
      all: "All",
      sent: "Sent",
      replied: "Replied",
      failed: "Failed",
      stopped: "Stopped",
      answered: "Answered",
    },
    // The list of mailings: when a draft was last saved, and how many a draft or one scheduled goes to.
    savedAt: (when: string) => `Saved ${when}`,
    toCount: (n: number) => `to ${n} ${n === 1 ? "person" : "people"}`,
    // The bar of how far a mailing sending has got, and once it's sent, how many have answered its ask.
    sendingBar: (n: number, of: number) => `Sending: ${n} of ${of} sent`,
    answeredBar: (n: number, of: number) => `Sent: ✓ ${n} of ${of} answered the ask`,
    // The band at the top of a mailing's page: when it started sending, and who sent it.
    started: "Started",
    by: (who: string) => `by ${who}`,
    // Over a mailing's recipients filtered by one of its counts, back to them all.
    showEveryone: "Show everyone",
    // Each recipient's link to their letter's page, with their replies when there are some.
    letterAndReplies: (n: number) => (n === 1 ? "Letter and reply →" : "Letter and replies →"),
    theLetter: "Letter →",
    // In a mailing's email, who it's to: each recipient, as it's a letter to many.
    toEach: "Each recipient, by name and address",
    emailTitle: "The email",
    skipReasons: {
      blocked: "Address blocked",
      "left-office": "Left office",
      "no-email": "No email address",
    } as Record<string, string>,
  },
  // The asks page: each ask, its kind and date, and how many gave each answer.
  asks: {
    title: "Asks",
    intro: "What we ask notable people to do, either by writing to them or by meeting them.",
    edit: "Edit",
    // The form, adding an ask or editing one; the new one's title is the asks page's button to it, too.
    newTitle: "New ask",
    editTitle: (title: string) => `Edit the ask “${title}”`,
    fields: {
      kind: "We ask them to",
      askedBy: "Who has or will ask them",
    },
    // The rest of the form's fields, by the kind of ask: the title reads on from "sign" or "attend".
    byKind: {
      letter: {
        title: "Which letter",
        titleExample: "Giant pause button funding request to the Chancellor",
        date: "When the letter was started",
        url: "Where to read the letter",
      },
      event: {
        title: "Which event",
        titleExample: "Tea, biscuits and existential risk conference",
        date: "When the event is",
        url: "Where to learn more about the event",
      },
    } as Record<string, { title: string; titleExample: string; date: string; url: string }>,
    // Under the link, in red, while what's in it isn't a whole one.
    badLink: "Give a full link beginning https://",
    // Over an ask's slug, which doesn't change.
    slugLabel: "Identifier: ",
    kindFixed: askLimits.kindFixed,
    fixed: askLimits.fixed,
    // Beside the form: the ask as it will show on a politician's page.
    previewTitle: "What the ask will look like on a politician's page",
    save: "Save ask",
    delete: "Delete ask",
    notDeletable: askLimits.notDeletable,
    // After saving or deleting, or failing to.
    notices: {
      added: "Ask added.",
      saved: "Ask saved.",
      deleted: "Ask deleted.",
      // The same as the form says, when a save or a delete is refused for it.
      fixed: askLimits.fixed,
      "kind-in-use": askLimits.kindFixed,
      "in-use": askLimits.notDeletable,
      gone: "That ask has been deleted.",
    } as Record<string, string>,
    // Over the list: how many there are.
    total: (n: number) => `${n} ${n === 1 ? "ask" : "asks"}`,
    none: "No asks yet.",
    columns: {
      ask: "Title",
      kind: "We ask them to",
      date: "Date",
      // Who asks it: supporters, in a campaign's letter, or PauseAI, in a mailing; or both.
      askedBy: "Asked by",
      answers: "Answers",
      writtenTo: "Written to",
      answered: "Answered",
      how: "How we asked",
    },
    kinds: { letter: "Sign a letter", event: "Attend an event" } as Record<string, string>,
    // Over a mailing's or campaign's ask, and before it on their lists.
    askTo: { letter: "Ask to sign", event: "Ask to attend" } as Record<string, string>,
    noAsk: "No ask",
    // An ask's own page.
    page: {
      asked: "Asked",
      started: "Started",
      on: "On",
      readIt: { letter: "Read it", event: "Find out more" } as Record<string, string>,
      theLink: { letter: "The letter", event: "The event" } as Record<string, string>,
      writtenTo: "written to",
      answered: "answered",
      howWeAsked: "How we asked",
      answersTitle: "Answers",
      showAll: "Show all the answers",
      none: "No answers yet.",
      noWay: "No mailing or campaign has put this.",
      politician: "Politician",
      answer: "Answer",
      lastWrittenTo: "Last written to",
      everyone: "Every politician with this ask →",
      bar: (answered: number, of: number, kind: string) =>
        `${answered} of ${of} politicians answered whether they'd ${kind === "letter" ? "sign" : "attend"}`,
      campaign: "Campaign",
      mailing: "Mailing",
      letters: (n: number) => `${n} ${n === 1 ? "letter" : "letters"}`,
      way: (n: number, word: "campaign" | "mailing") => `${n} ${word}${n === 1 ? "" : "s"}`,
    },
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
    // At the top right of their page, before where they came from.
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
    // In the form's row of answers, set apart from them, once there's an answer: picked and saved, it clears it.
    clearAnswer: "Clear answer",
    // Under the asks, the small button whose menu lists the other asks staff record, to add one to the card.
    otherAsk: "Add another answer",
    // The fields of the box at the top.
    status: "Status",
    country: "Nation",
    // Over the notes Airtable has on them, which are changed there.
    notes: "Notes from Airtable",
    // Over how to write to them: their address and salutation.
    writing: "Writing to them",
    // Airtable's markers, as tags by their name.
    importantTarget: "Important target",
    personalConnection: "Personal connection",
    // When their record was no longer in Airtable.
    airtableRemoved: (when: string) => `No longer in Airtable since ${when}`,
    // The band at the top of their page: where their record came from, and the counts at its right.
    band: {
      // The asks they signed, are going to, or are meeting our staff at.
      asksDone: (n: number) => (n === 1 ? "ask done" : "asks done"),
      lettersCounted: (n: number) => (n === 1 ? "letter from a supporter" : "letters from supporters"),
    },
    historyTitle: "History",
    // A status set or cleared, in the history: around the ask's name.
    statusSet: (status: string) => ({ before: `${status} '`, after: "'" }),
    statusCleared: { before: "Answer cleared for '", after: "'" },
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
      // A staff member's note on them, before who wrote it.
      note: "Note",
      "add politician": "Added",
      "edit politician": "Details edited",
      "remove politician": "No longer in Airtable",
      "block address": "Address blocked",
      "unblock address": "Address unblocked",
    } as Record<string, string>,
    // At the foot of the page of one whose record has gone from Airtable, and who's had no letters.
    delete: {
      button: "Delete politician",
      note: "Their record has gone from Airtable and nobody has written to them, so they can be deleted here too.",
    },
    // On an MP from Airtable, after the source, which links to their record there.
    editInAirtable: ", update there",
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
    // Beside a bounce read from someone's Gmail, rather than reported by Postmark.
    foundInGmail: "found in Gmail",
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
      mailing: "Mailing",
      "mailing-test": "Test copy of a mailing",
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
    // The mail server's reason quoted after its own sentence, and the link on a line of its own.
    body: (mp: string, address: string, reason: string, link: string) =>
      `A letter to ${mp} (${address}) didn't arrive. The mail server said: “${reason.replace(/\.+$/, "")}.”\n\nNothing more will be sent to that address until it's fixed in Airtable and unblocked here:\n${link}`,
  },
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
  // The copy every 5 minutes of the Luma calendar's events, guests and contacts
  // (lib/server/luma-import.ts), on the import page.
  luma: {
    title: "Events and guests from Luma",
    intro: {
      before: "The public events on ",
      link: "our Luma calendar",
      after: ", who registered for each, who the hosts are. Also who is subscribed to the calendar (the contacts).",
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
    // After the counts, how many hosts were added to or taken off events (runs kept before hosts were copied don't say).
    hostsChanged: (n: number) => `${n} ${n === 1 ? "host" : "hosts"} changed.`,
    // After that, how many pages of contacts the run read (runs kept before this was recorded don't say).
    contactPages: (pages: number) => `${pages} pages of contacts read.`,
    // After that, the postcodes and towns looked up at postcodes.io for where supporters are (runs kept before this was recorded don't say).
    places: (p: { postcodes: number; towns: number }) =>
      `${p.postcodes} ${p.postcodes === 1 ? "postcode" : "postcodes"}, ${p.towns} ${p.towns === 1 ? "town" : "towns"} looked up.`,
    // After that, when postcodes.io failed partway: the next run carries on.
    placesFailed: "Postcodes.io failed: the next run carries on.",
    stoppedBy: {
      time: "Stopped: out of time.",
      "rate-limit": "Stopped: near Luma's rate limit.",
      running: "Another run was already going.",
    } as Record<string, string>,
  },
  // A supporter's letter on its page: what they changed in the draft the campaign gave them.
  letterChanges: {
    // Toggles to the letter as the MP got it, and back.
    asSent: "Show as sent",
    showChanges: "Show changes",
    // In place of paragraphs left as they were; a click unfolds them.
    folded: (n: number) => (n === 1 ? "1 paragraph unchanged" : `${n} paragraphs unchanged`),
    // An automatic reply folded to its first paragraph: in place of the rest, which a click unfolds; then back.
    more: (n: number) => (n === 1 ? "1 more paragraph" : `${n} more paragraphs`),
    showLess: "Show less",
  },
  // The letters inbox, which supporters' letters to MPs go from (lib/server/letters-inbox-reading.ts).
  lettersInbox: {
    // The labels reading puts on each message in Gmail, by what it made of it.
    labels: {
      relayed: "Relayed",
      noted: "Noted",
      spam: "Spam",
      notUnderstood: "Not understood",
    },
    // After the account's line in a run.
    result: (a: { relayed: number; spam: number; uncertain: number }) =>
      `${a.relayed} relayed, ${a.spam} spam, ${a.uncertain} matched to a letter only as its latest.`,
    // Each message not understood, a line each, with a link to it in Gmail.
    notUnderstood: "Not understood:",
    reasons: {
      unknown_proxy: "to a proxy we don't have",
      no_proxy: "to none of our proxies",
      stranger: "from neither the supporter nor their MP's office",
      not_verified: "failed authentication",
      over_cap: "over its letter's limit on relays",
      bounce: "a bounce of nothing we sent",
    } as Record<string, string>,
    openInGmail: "Open in Gmail",
    // The email to the policy inbox after a run with any.
    alert: {
      subject: (count: number, inbox: string) =>
        `${count} MP ${count === 1 ? "email" : "emails"} in ${inbox} not relayed`,
      body: (inbox: string, lines: string[], runUrl: string) =>
        `Open each in Gmail and deal with it by hand: forward it, answer it, or leave it.\n\n${lines.join("\n")}\n\nThe run: ${runUrl}`,
    },
  },
  // The emails to the notification inbox (lib/server/notifications.ts) that
  // aren't above (alert, lettersInbox.alert): each a subject, and a body with
  // a link to where a person can deal with it.
  notifications: {
    // An import's run failed, after one that didn't: its title, its error, its page.
    importFailed: {
      subject: (job: string) => `The import '${job}' failed`,
      body: (job: string, error: string, link: string) =>
        `The import '${job}' failed with the error: "${error}". It will try again at its next run, and you won't be emailed again until it has worked.\n\nIts runs: ${link}`,
    },
    // The MP import is held, as it would change too much: how many MPs, and its page.
    syncHeld: {
      subject: (changes: number) => `MP import would change ${changes} MPs`,
      body: (changes: number, link: string) =>
        `The MP import would change ${changes} MPs, so it's held until someone checks it. Review it, then apply or discard it, and fix any problems in Airtable:\n\n${link}`,
    },
    // Google stopped our access to a connected Gmail: whose, what stops, and where to connect it again.
    gmailDisconnected: {
      subject: (account: string) => `${account}'s Gmail is disconnected`,
      body: (account: string, lettersInbox: boolean, link: string) =>
        `Google stopped our access to ${account}'s Gmail. ${lettersInbox ? "Letters to MPs, and the replies to them, wait until it's connected again." : "Mailings sent using that mailbox, and replies, will be paused until it's connected again."} Log in as ${account} and connect it on its account page:\n\n${link}`,
    },
    // Once a day at most: the supporters' copies that bounced since the last, so their MP's replies can't be
    // passed on; how many replies are held; each address's domain and what its server said.
    supporterBounces: {
      subject: (count: number) => `${count} supporters' ${count === 1 ? "address" : "addresses"} bounced`,
      body: (count: number, held: number, lines: string[], link: string) =>
        `${count} supporters' copies of their letters bounced since the last report, so their MPs' replies can't be passed on to them. ${held} ${held === 1 ? "reply is" : "replies are"} held. Each address's domain, and what its server said:\n\n${lines.join("\n")}\n\nSupporters' blocked emails: ${link}`,
    },
    // Letters to MPs have waited LATE_HOURS to go: how many, why, and the queued letters.
    lettersWaiting: {
      subject: (count: number, hours: number) =>
        `${count} ${count === 1 ? "letter" : "letters"} to MPs waiting over ${hours} hours`,
      body: (count: number, hours: number, why: string, link: string) =>
        `${count === 1 ? "A letter" : `${count} letters`} to MPs ${count === 1 ? "has" : "have"} waited over ${hours} hours to go. Why: ${why}.\n\nThe letters waiting: ${link}`,
    },
  },
  // The read every 5 minutes of the connected Gmail accounts for replies to our
  // letters and bounces (lib/server/gmail-reading.ts), on the import page.
  gmailReading: {
    oneOffs: (n: number) => `${n} one-off ${n === 1 ? "email" : "emails"} kept.`,
    title: "Replies, bounces and one-off emails from Gmail",
    intro: {
      before: "Reads the replies to our letters, and their bounces, in each ",
      link: "connected Gmail account",
      after: ". From policy@ and Joseph's, it also imports any threads with politicians as one-off emails.",
    },
    readNow: "Read Gmail now",
    never: "Not read yet.",
    // The run's totals, over every account, then a line for each.
    result: (accounts: { replies: number; autoReplies: number; bounces: number }[]) =>
      `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"} read: ${accounts.reduce((n, a) => n + a.replies, 0)} replies, ${accounts.reduce((n, a) => n + a.autoReplies, 0)} automatic replies, ${accounts.reduce((n, a) => n + a.bounces, 0)} bounces.`,
    account: (a: { account: string; replies: number; autoReplies: number; bounces: number }) =>
      `${a.account}: ${a.replies} replies, ${a.autoReplies} automatic replies, ${a.bounces} bounces.`,
    // After an account's line: its history had gone, so the last few days were searched instead.
    restarted: "Searched the last three days again, as Gmail had forgotten where we were up to.",
    failed: (error: string) => `Couldn't be read: ${error}`,
    // In place of that, when Google refused the account's access, so the site disconnected it.
    disconnected:
      "Google refused our access, so this account has been disconnected. Its owner can connect it again from their account page.",
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
  campaigns: {
    title: "Campaigns",
    intro: "Letters supporters write to politicians, through a form on the site.",
    none: "No campaigns yet.",
    fromSupporters: "From supporters",
    noLetters: "No letters",
    started: "Started",
    last: "Last letter",
    from: "From",
    to: "To",
    supporters: (n: number) => `${n} ${n === 1 ? "supporter" : "supporters"}`,
    politicians: (n: number) => `${n} ${n === 1 ? "politician" : "politicians"}`,
    lettersTo: (letters: number, politicians: number) =>
      `${letters} ${letters === 1 ? "letter" : "letters"} to ${politicians} ${politicians === 1 ? "politician" : "politicians"}`,
    theLetter: "The letter",
    publicPage: "Public page",
    seePublicPage: "See it",
    version: "Version of the letter",
    versionLine: (from: string | null, n: number) =>
      `${from ? `From ${from}: ` : ""}${n} ${n === 1 ? "letter" : "letters"}`,
    // Over a campaign's letter, as a mailing's says who it's to.
    fromEach: "Each supporter",
    lettersTitle: "Letters",
    // Over the letters one of the counts has chosen, and the way back to them all.
    tabs: {
      sent: "Letters that arrived",
      failed: "Letters that failed",
      replied: "Letters with a reply",
      answered: "Letters to those who answered",
      changed: "Letters with the text changed",
    },
    showAll: "Show all the letters",
    // Under how much of their letters was their own, leading to those letters.
    changedLink: (n: number) => `${n} changed the wording`,
    columns: { politician: "Politician", from: "From", ownWords: "Own words", status: "Status" },
    fields: {
      salutation: "Salutation",
      constituency: "Constituency",
      name: "Name",
      postcode: "Postcode",
    } as Record<string, string>,
    noText: "We've lost the text.",
  },
  sentEmails: {
    search: "Address or subject",
    total: (n: number) => `${n} ${n === 1 ? "email" : "emails"}`,
    none: "No emails match.",
    columns: {
      when: "When",
      what: "What",
      to: "To",
      from: "From",
      backend: "Backend",
      subject: "Subject",
      outcome: "Outcome",
      links: "Links",
    },
    purposes: {
      letter: "Letter",
      "letter-copy": "Supporter's copy",
      relay: "Message relayed",
      "supporter-notice": "Notice to supporter",
      "office-notice": "Notice to MP's office",
      "forwarded-reply": "Forwarded reply",
      "staff-login": "Staff sign-in",
      "staff-alert": "Staff alert",
      "staff-report": "Staff report",
      mailing: "Mailing",
      "mailing-test": "Mailing test",
    } as Record<string, string>,
    backends: { postmark: "Postmark", gmail: "Gmail" } as Record<string, string>,
    outcomes: {
      sent: "Sent",
      refused: "Refused",
      failed: "Failed",
      bounced: "Bounced",
      complaint: "Spam complaint",
    } as Record<string, string>,
    imported: "Imported",
    letterLink: "Letter →",
    campaignLink: "Campaign →",
    mailingLink: "Mailing →",
    filters: {
      purpose: "What",
      outcome: "Outcome",
      backend: "Backend",
      links: { letter: "Has a letter", campaign: "Has a campaign", mailing: "Has a mailing" },
    },
  },
  oldLetters: {
    title: "Old letters and threads with politicians",
    intro: {
      before:
        "Reads old emails to politicians from Joseph's and policy@'s mail. Matches them to campaigns or mailings, or marks them as ",
      link: "one-off emails",
      after: ". Each run reads for up to 15 minutes and carries on from where the last stopped.",
    },
    importNow: "Import old letters",
    dryRun: "Dry run: change nothing, and report what happen",
    never: "Not imported yet.",
    // Each mailing the import makes or fills, by its key in lib/old-letters.ts.
    mailingTitles: {
      "deepmind-30-june": "DeepMind: by 30 June",
      "deepmind-ten": "DeepMind: ten of your colleagues",
      "deepmind-25": "DeepMind: join 25 of your colleagues",
      "deepmind-40": "DeepMind: join 40 of your colleagues",
      "deepmind-august": "DeepMind: August, from the personal Gmail",
      "deepmind-others": "DeepMind letter: the others",
      "documentary-signatories": "Documentary: invitation to signatories",
      "documentary-reminder": "Documentary: reminder to signatories",
      "russell-speak": "Stuart Russell panel: invitation to speak",
      "russell-cohost": "Stuart Russell panel: invitation to co-host",
      "conference-parliament": "Conference in Parliament",
      "liability-own": "Liability letter: Joseph's own",
      "frontier-own": "Frontier AI letter: Joseph's own",
    } as Record<string, string>,
    result: (r: {
      dryRun: boolean;
      finished: boolean;
      read: number;
      left: number;
      replies: number;
      autoReplies: number;
      oneOffs: number;
      formTexts: number;
      postmarkTexts: number;
    }) =>
      `${r.dryRun ? "Dry run: would have read" : "Read"} ${r.read} messages, ${r.left} left${r.finished ? ", all done" : ""}: ${r.formTexts} form letters' and ${r.postmarkTexts} Postmark letters' text, ${r.replies} replies, ${r.autoReplies} automatic replies and ${r.oneOffs} one-off emails.`,
    stoppedByGmail: "It stopped early because Gmail refused a request. Press again later.",
    unreadable: (n: number) => `Gmail wouldn't give ${n} ${n === 1 ? "message" : "messages"}.`,
    joined: "Joined to their sent emails",
    added: "Added from sent emails",
    notJoined: "No sent email found",
    unmatched: "Mail matching nothing, in policy@ and the group's archive",
    matchedNothing: (n: number) => `${n} messages matched nothing.`,
    onlyWithSupporters: "Only staff who see supporters can see which.",
  },
  oneOff: {
    // The page's title, and a thread's way back.
    title: "One-off emails",
    intro: (inbox: string) => `Threads copied to ${inbox} that aren't part of a mailing or a campaign.`,
    threads: (n: number) => `${n} ${n === 1 ? "thread" : "threads"}`,
    none: "No one-off emails yet.",
    columns: {
      when: "Last message",
      subject: "Subject",
      messages: "Messages",
      answered: "Answered",
      politician: "Politician",
      participants: "Participants",
      mailbox: "Mailbox",
    },
    answers: { yes: "Yes", no: "No" },
    hidden: "Only staff who see supporters can read this.",
    noPolitician: "Parliament address",
    noSubject: "(no subject)",
    thread: "The thread",
    unreadable: "This message couldn't be read.",
    // On a politician's and a supporter's page.
    onPageTitle: "One-off emails",
    // On your own page, under your Gmail.
    // Around a link to the one-off emails, which says their title.
    kept: { before: "All threads with politicians in this specific mailbox are kept, and show under", after: "." },
    // In any other mailbox, around a link to the mailings.
    notKept: { before: "Replies to threads sent like this will be kept, and show under", after: "." },
    unmatchedAlert: {
      subject: (n: number) => `${n} ${n === 1 ? "email" : "emails"} in policy@ matched no politician`,
      body: (lines: string[], link: string) =>
        `Some emails arrived in the policy@ inbox and weren't kept, because they didn't match a politician. Work out who they're from, and widen the rule or add exceptions.\n\n${lines.join("\n")}\n\n${link}`,
    },
  },
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
    // Each import's icons, named for screen readers and on hover: where it's
    // from, and whether it only checks. Then how often it runs, the overview's
    // headings and a lozenge on the job's page.
    airtable: "Airtable",
    web: "Web",
    luma: "Luma",
    gmail: "Gmail",
    nightly: "Nightly",
    frequent: "Every 5 minutes",
    hourly: "Hourly",
    oneOff: "One-off",
    checkOnly: "Check only",
  },
  letters: {
    title: "Letters to MPs",
    // Over the list: how many there are.
    total: (total: number) => `${total} ${total === 1 ? "letter" : "letters"}`,
    search: "Sender or MP",
    // The Replied filter: whether the MP replied.
    // The Replied filter: what came back to a letter.
    answered: { yes: "Written reply", auto: "Automatic reply only", no: "No reply" },
    // The titles of a letter's own page, and of a supporter's letters' page.
    oneTitle: (from: string, to: string) => `Letter from ${from} to ${to}`,
    fromTitle: (name: string) => `Letters from ${name}`,
    // Who PauseAI's letters are from, in a letter's title.
    fromPauseai: "PauseAI UK",
    // A letter's own page: its facts beside the list's, and the way to read it as it was sent.
    detail: {
      subject: "Subject",
      sent: "Sent",
      mailing: "Mailing",
      personalised: "Personalised",
      historyTitle: "History",
      // Under the ask a supporter's letter makes, before its campaign's name.
      basedOn: "Based on the campaign",
      noHistory: "Nothing recorded yet.",
      // What a change of status recorded, each field's name before its value: Postmark's, a bounce's, a reply's.
      fields: {
        messageId: "Message ID",
        type: "Type",
        description: "Description",
        reason: "Reason",
        email: "Address",
        from: "From",
        to: "To",
        cc: "Cc",
        replyTo: "Reply-To",
        subject: "Subject",
        // What sending from Gmail and reading its mailbox record.
        name: "Name",
        account: "Gmail",
        status: "Code",
        bcc: "Bcc",
        notice: "Notice",
        uncertain: "Which letter",
      } as Record<string, string>,
      // The value of uncertain: the reply named none of the supporter's letters to the MP, so it was put with the newest.
      uncertainLetter: "A guess: their newest to this MP, as the reply didn't say which it answers",
      // A reason, recorded as a word, in words: why a letter, copy or relay waits or wasn't relayed.
      reasons: {
        not_connected: "The letters inbox isn't connected",
        daily_limit: "The letters inbox reached its daily limit",
        failed: "Gmail refused it or couldn't be reached; it'll try again in every hour",
        blocked: "The address is blocked, as it bounced",
        not_verified: "It failed authentication, so may be forged",
        over_cap: "Over the letter's limit on relays, in case of a loop",
      } as Record<string, string>,
      // What a notice to the supporter said.
      notices: { bounced: "Their message hasn't reached the MP", resent: "It has now gone" } as Record<string, string>,
      // Under a reply, what was done with it: each line's name, before who to; "Not forwarded" when it went to no one.
      handling: {
        forwarded: "Forwarded to",
        not_forwarded: "Not forwarded to",
        nowhere: "Not forwarded",
        failed: "Forward failed",
      },
      // Why, under each line of what was done with a reply.
      handlingReasons: {
        policy_inbox: "Every reply goes to the shared inbox",
        sender: "The sender, who wasn't sent it",
        copied: "Already in its To or Cc",
        own_follow_up: "It's their own follow-up",
        bounce_address: "Came to the bounce address",
        gmail: "Read from Gmail, where it already is",
        refused: "Postmark refused it",
        blocked: "The address is blocked",
      },
    },
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
      scheduled: "Scheduled",
      cancelled: "Stopped",
      skipped: "Skipped",
      // A supporter's letter from the letters inbox, waiting to go, and what's done with it and the messages both ways.
      queued: "Queued",
      copy_sent: "Copy sent to supporter",
      copy_held: "Copy held",
      copy_bounced: "Copy bounced",
      copy_delayed: "Copy delayed",
      relayed: "Relayed",
      relay_queued: "Relay queued",
      relay_held: "Relay held",
      relay_bounced: "Relay bounced",
      relay_delayed: "Relay delayed",
      relay_uncertain: "Relay uncertain",
      not_relayed: "Not relayed",
      notice: "Supporter told",
      office_told: "MP's office told",
    } as Record<string, string>,
    columns: {
      created: "Written",
      sent: "Sent",
      from: "From",
      to: "To",
      campaign: "Campaign",
      // The share of the sent letter's words that weren't in the campaign's draft.
      ownWords: "Own words",
      backend: "Backend",
      status: "Status",
      replied: "Replied",
      history: "History",
    },
    // A letter's own words, as a percentage of its words.
    ownWords: (share: number) => `${Math.round(share * 100)}%`,
    // What sent a letter: pauseai.info's old form, whose letters are copied from Airtable, or this site, by Postmark
    // or by a staff member's Gmail.
    backends: { airtable: "Airtable", postmark: "Postmark", gmail: "Gmail" },
    // The filter by the MP's markers, which are the politicians list's.
    mpFlag: "MP marked",
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
    // A list's page title, in the browser's tab, with its search and filters that are on, shortened.
    pageTitle: (title: string, filters: string) => `${title}: ${filters}`,
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
  // The notes on a supporter's or a politician's page, and the form to add one.
  notes: {
    title: "Notes",
    none: "No notes yet.",
    // After who wrote it and when, once it's been edited.
    edited: "edited",
    // The field's name, for a screen reader.
    note: "Note",
    // Under a note's buttons, when the server wouldn't change it: its writer's day is up.
    tooLate: {
      edit: "Notes can only be edited for 24 hours.",
      delete: "Notes can only be deleted for 24 hours.",
    },
    // The button that opens the field to write one, and the one that closes it unsent.
    write: "Write a note",
    cancel: "Cancel",
    add: "Add note",
    edit: "Edit",
    save: "Save",
    delete: "Delete",
    // Under the field on a supporter's page: what a note about them should be.
    guidance:
      "Only write notes you'd be happy for them to read (as they can via GDPR). Avoid writing about health, beliefs or private life.",
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
      eventId: "Event",
      owner: "Owner",
      previous: "Before",
      url: "Google Doc",
    } as Record<string, string>,
    // A held MP import decided, linked to the import's page.
    run: (id: string) => `Import run ${id}`,
    // After each number an import, a sync, an erasure or the end of sessions logged: what it counted, for one and for more.
    counts: {
      added: () => "added",
      removed: () => "removed",
      changed: () => "changed",
      matched: () => "matched",
      alreadySet: () => "already signed",
      problems: (n: number) => (n === 1 ? "problem" : "problems"),
      lumaUsers: (n: number) => (n === 1 ? "Luma person" : "Luma people"),
      formEntries: (n: number) => (n === 1 ? "form entry" : "form entries"),
      letters: (n: number) => (n === 1 ? "letter" : "letters"),
      members: (n: number) => (n === 1 ? "member record" : "member records"),
      proxies: (n: number) => (n === 1 ? "proxy" : "proxies"),
      messages: (n: number) => (n === 1 ? "message in the letters inbox" : "messages in the letters inbox"),
      sessions: (n: number) => (n === 1 ? "session" : "sessions"),
    } as Record<string, (n: number) => string>,
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
  "read-gmail": staffCopy.gmailReading.title,
  "import-old-letters": staffCopy.oldLetters.title,
};
