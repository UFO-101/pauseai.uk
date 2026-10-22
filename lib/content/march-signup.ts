// Every word the march sign-up's cards show (app/(march)/): the form, the
// share card and the thank-you card. The page's own text is in its components.
import { march } from "./march";
import { site } from "./site";

/** The sign-up page's address, as people share it. */
const signupUrl = `${site.url}${march.signupPath}`;

const emailSubject = `The biggest ever AI protest - ${march.city}, ${march.dateLong}`;

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
    phoneHint: "For text updates on the day.",
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
    message:
      `[TO DO: share message] \n\n` +
      `Register here: ${signupUrl} \n\n` +
      `(Can't go? Help us spread the word instead by forwarding this message - thank you!)`,
    url: signupUrl,
    emailSubject,
    share: "Share",
    copy: "Copy message",
    copied: "Message copied",
    finish: "I can’t think of anywhere else",
  },
  thanks: {
    manage: "Manage your registration on Luma",
    registerAnother: "Register someone new",
  },
};
