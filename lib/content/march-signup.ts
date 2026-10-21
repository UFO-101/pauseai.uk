// Every word the march sign-up's form and share step show (app/(march)/).
// The pages' own text is in their components.
import { march } from "./march";
import { site } from "./site";

/** The sign-up page's address, as people share it. */
const signupUrl = `${site.url}${march.signupPath}`;

const emailSubject = `The biggest ever AI protest - ${march.city}, ${march.dateLong}`;

export const marchSignupCopy = {
  form: {
    head: "Count me in",
    firstName: "First name",
    lastName: "Last name",
    email: "Email address",
    phone: "Phone",
    city: "City",
    optional: "Optional",
    phoneHint: "For text updates on the day.",
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
    message:
      `[TO DO: share message] \n\n` +
      `Register here: ${signupUrl} \n\n` +
      `(Can't go? Help us spread the word instead by forwarding this message - thank you!)`,
    url: signupUrl,
    emailSubject,
    title: emailSubject,
    share: "Share",
    copy: "Copy message",
    copied: "Message copied",
    appsLabel: "Or pick a place to post it",
    finish: "I can’t think of anywhere else",
    /** Shown once, when someone comes back from their first share. */
    nudgeTitle: "Where else?",
    nudge:
      "The average AI researcher puts an 18% chance on AI causing human extinction or severe disempowerment. Most people do not realise how extreme AI's impacts will be. How many group chats are you in?",
  },
};
