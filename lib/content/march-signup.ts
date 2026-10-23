// Every word the march sign-up's cards show (app/(march)/): the form, the
// share card and the thank-you card. The page's own text is in its components.
import { march } from "./march";
import { site } from "./site";

/** The sign-up page's address. */
const signupUrl = `${site.url}${march.path}`;

/**
 * Where the share card sends the message: each app in its row, the copied
 * message, and a phone's share sheet.
 */
export type ShareSource =
  | "whatsapp"
  | "telegram"
  | "x"
  | "bluesky"
  | "facebook"
  | "threads"
  | "linkedin"
  | "reddit"
  | "email"
  | "copy"
  | "share_sheet";

/*
 * Every tracked link to the sign-up has one tag, a short utm_source code that
 * says where it came from. The codes are listed in docs/march-links.md.
 */

/** The sign-up's address as every share option gives it out, tagged as a share. */
const shareUrl = `${signupUrl}?utm_source=sh`;

const emailSubject = `The biggest ever AI safety protest - ${march.city}, ${march.dateLong}`;

/** The end of the share message, and the whole of it where posts are short. */
const shortMessage =
  `PauseAI UK is organising a march through Central London, expected to be the biggest ever AI safety protest.\n\n` +
  `Saturday 21 November 2026, 12–3pm\n` +
  `Start: All Souls’ Place, London W1B 3DA\n` +
  `End: Downing Street, London SW1A 2AA\n\n` +
  `Register now: ${shareUrl}`;

/**
 * AI Impacts' survey of 1,580 AI researchers, December 2024 ("Advanced AI
 * according to 1,580 researchers", September 2026): the 18% is the average
 * chance they gave of future AI advances causing human extinction or similarly
 * permanent and severe disempowerment (its abstract, and section 3.9).
 */
export const AI_IMPACTS_SURVEY_URL = "https://aiimpacts.org/wp-content/uploads/2026/09/ESPAI2024.pdf";

export const marchSignupCopy = {
  form: {
    head: "Count me in",
    name: "Full name",
    email: "Email address",
    phone: "Phone",
    city: "City",
    postcode: "Postcode",
    optional: "Optional",
    phoneHint: "For text updates on the day",
    cityHint: "For local group updates",
    postcodeHint: "For constituency-based campaigns",
    mailingList: "Keep me in the loop about future campaigns and developments. (You can unsubscribe at any time.)",
    honeypot: "Leave this empty",
    submit: "Register",
    submitting: "Registering…",
    failed: "Sorry, your registration didn't go through.",
    lumaFallback: "Register on our Luma event page instead.",
    privacy: "We only use your data to organise and improve our campaigns. See our",
    privacyLink: "privacy policy",
  },
  /** What the server says about a name or email it won't take. */
  errors: {
    missing: (label: string) => `Please enter your ${label}.`,
    check: (label: string) => `Please check your ${label}.`,
    emailMissing: "Please enter your email address.",
    emailInvalid: "Please enter a valid email address.",
  },
  share: {
    title: "Double your impact",
    /** "The average AI researcher puts an [18% chance] on …", the link to the survey that found it. */
    impact: {
      before: "The average AI researcher puts an ",
      link: "18% chance",
      after:
        " on AI causing human extinction or severe disempowerment. Most people do not realise how extreme AI's impacts will be.",
    },
    /** "Please share this with [as many people and groups as you can think of]. …", the middle in bold. */
    plea: {
      before: "Please share this with ",
      bold: "as many people and groups as you can think of",
      after: ". Our entire future is at stake.",
    },
    /** The message every share option sends, but X, Bluesky and Threads. */
    message:
      `📣 March with me against AI extinction!\n\n` +
      `AI companies are racing to develop superintelligent, fully autonomous agents that can outperform humans at all cognitive tasks. Experts warn that this risks humanity permanently losing control – how can we control something that is smarter than us?\n\n` +
      `Just a year ago, this was a theoretical concern. As of today, AI agents have broken out of containment and hacked external systems at least a dozen times. We must pause frontier AI development before it's too late.\n\n` +
      shortMessage,
    /** The message for X, Bluesky and Threads, inside their 280, 300 and 500-character limits. */
    shortMessage,
    /** The sign-up's address, for the share options that take a link alone. */
    url: shareUrl,
    emailSubject,
    share: "Share",
    copy: "Copy message",
    copied: "Message copied",
    finish: "I can’t think of anywhere else",
  },
  thanks: {
    registerAnother: "Register someone new",
  },
};
