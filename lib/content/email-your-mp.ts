// The Email your MP campaigns: what the form and the server need to know about
// each, and every word the tool shows or sends. Each campaign's page has its
// own words (app/(site)/campaigns/<slug>/page.tsx).

// Relative, as next.config.ts imports this file and its loader resolves only its own "@/" imports.
import { CONTROLAI_LETTER_ASK, FRONTIER_AI_LETTER_ASK, type AskStatus, type AskStatuses } from "../asks";
import { signedControlAiLetter } from "../controlai-letter";

/** The MP's answer to each ask, keyed by the ask's slug (lib/asks.ts). */
export type MpStatuses = AskStatuses;

/** What a letter needs to know about who it's from and who it's to. */
export type LetterDetails = {
  /** "Ms Dummy". */
  salutation: string;
  constituency: string;
  senderName: string;
  /** What the MP has done, so a letter can say so. */
  statuses: MpStatuses;
};

export type Attachment = {
  /** File name in public/pdfs/. */
  file: string;
  /** Thumbnail in public/pdfs/, shown on the form. */
  thumbnail: string;
  title: string;
  subtitle: string;
};

type CampaignCommon = {
  /**
   * The page is app/(site)/campaigns/<slug>/page.tsx, which has the
   * page's own words. Letters in the database are keyed by it, and each
   * campaign has a row in the campaigns table, with the same title and ask.
   */
  slug: string;
  /** Its name in the staff interface. */
  title: string;
  /** What it asks the MP to do, whose answer we record (lib/asks.ts), if anything. */
  ask?: string;
  subject: string;
  /**
   * The letter to an MP who hasn't done it yet, through the sign-off and
   * the sender's name. The form adds their address and postcode under it
   * (lib/email-your-mp.ts). A blank line between paragraphs, **bold**,
   * _italic_, and "- " for bullets (lib/letter-format.ts).
   */
  letter: (details: LetterDetails) => string;
  attachments: Attachment[];
};

/**
 * A campaign an MP can have done, so its page moves on from them, or one
 * nobody has done, which is always there to move on to. The last campaign
 * must be one nobody has done (lib/email-your-mp.test.ts).
 */
export type Campaign = CampaignCommon &
  (
    | {
        ask: string;
        /** The ask's status that means this MP has done what the campaign asks. */
        done: AskStatus;
        /**
         * Shown instead of the form when the MP has already done it but the
         * page couldn't move on, because the browser wouldn't keep the lookup.
         */
        alreadyDone: string;
        /**
         * Shown on the next campaign's page when this one's page has moved on
         * to it, because the MP had already done this.
         */
        movedOn: string;
      }
    | { done?: undefined; alreadyDone?: undefined; movedOn?: undefined }
  );

/**
 * In priority order. Plain /campaigns redirects to the first, and a
 * campaign's page moves on to the first one the MP hasn't done. The last is
 * one nobody has done, so there's always one.
 */
export const campaigns: Campaign[] = [
  {
    slug: "regulate-letter-pm",
    title: "Regulate AI developers now",
    ask: FRONTIER_AI_LETTER_ASK,
    done: "signed",
    subject: "Request to co-sign letter on frontier AI risks",
    // The letter to the MP, drafted for the sender to edit.
    letter: (d) =>
      `Dear ${d.salutation}

I'm a resident of ${d.constituency} and a supporter of **PauseAI**, a civic movement focused on averting the risks of superhuman AI. I am very concerned that AI development is racing ahead without adequate protection for the public.

AI now poses an extremely serious risk to our national security. Parliamentarians in the United Kingdom, and politicians around the globe are moving to answer the call from AI developers, Nobel Laureates and concerned citizens to regulate AI immediately.

**The UK has no specific legal standards for frontier AI safety.** No regulator oversees frontier AI development. And UK law does not reliably hold developers liable for damage or deaths caused by their models, even when the danger is predictable, preventable and uniquely enabled by AI.

Please could you add your name to PauseAI's open letter (attached) in support of frontier AI legislation? And could we arrange a short meeting to discuss this important matter?

Thank you for your consideration,

${d.senderName}`,
    alreadyDone: "Good news: your MP has already signed the letter to the PM.",
    movedOn:
      "Good news! Your MP has already signed the letter to the PM. You can write to them about this related campaign instead.",
    attachments: [
      {
        file: "Frontier-AI-Open-Letter.pdf",
        thumbnail: "Frontier-AI-Open-Letter.jpg",
        title: "Open Letter",
        subtitle: "To the Prime Minister",
      },
      {
        file: "Frontier-AI-Risks-Policy-Briefing.pdf",
        thumbnail: "Frontier-AI-Risks-Policy-Briefing.jpg",
        title: "Policy Briefing",
        subtitle: "On frontier AI risks",
      },
    ],
  },
  {
    slug: "support-sobel-bill",
    title: "Support the Artificial Superintelligence Bill",
    ask: CONTROLAI_LETTER_ASK,
    // No "done": everyone is asked to go to the debate, so it's always there
    // to move on to.
    subject: "Request to support the Artificial Superintelligence Bill",
    letter: (d) =>
      `Dear ${d.salutation},

I'm a resident of ${d.constituency} and a supporter of **PauseAI**, a civic movement focused on averting the risks of superhuman AI. I am very concerned that AI development is racing ahead without adequate protection for the public.

AI now poses an extremely serious risk to our national security. Parliamentarians in the United Kingdom, and politicians around the globe are moving to answer the call from AI developers, Nobel Laureates and concerned citizens to stop building out of control superintelligence.

Alex Sobel MP has tabled the Artificial Superintelligence Bill to protect the public from this threat. It does the following:

- Makes it a crime to build an AI that could overpower the UK government
- Starts monitoring AI computing power, just as we do for nuclear weapons
- Pushes for a global ban with an international treaty

${signedControlAiLetter(d.statuses) ? `${copy.sobelBill.letterThanks}\n\n` : ""}**Please consider attending the second reading debate in person on Friday, 13th November to support the bill.**

Thank you for your consideration,

${d.senderName}`,
    // The bill's PDFs aren't written yet.
    attachments: [],
  },
];

/** The form, its messages, and the page around it. */
export const copy = {
  pageTitle: "Email your MP",
  pageDescription: "Contact your Member of Parliament about AI safety",
  lookup: {
    nameLabel: "Your name",
    // Beside the postcode, so a browser fills both from a saved address. It
    // goes at the end of the letter, under their name.
    addressLabel: "First line of your address",
    addressHint: "You need to give your real address, as MPs only reply to their constituents.",
    postcodeLabel: "Your postcode",
    button: "Find my MP",
    looking: "Looking up",
    nameRequired: "Please enter your name.",
    addressRequired: "Please fill in your postal address.",
    postcodeRequired: "Please enter a postcode.",
    notFound: "Postcode not found.",
    noConstituency: "No parliamentary constituency found for this postcode.",
    noMp: "No MP found for your constituency.",
    failed: "Something went wrong on our end. Please try again in a moment.",
    // Above the MP's name, once found.
    yourMp: "Your MP",
    mpOf: (constituency: string) => `MP for ${constituency}`,
    // Outside production only, under the form: the first test postcode, and
    // the rest, with what each MP is for, behind an arrow.
    testPostcodes: "Dev site takes test postcodes only. Expand for more. Default one: ",
    testMpSigned: (campaign: string) => `signed “${campaign}”`,
    testMpNoEmail: "no email",
    testMpBounces: "emails bounce",
    noEmail: "No email found for your MP.",
    // Their address bounced before: nothing is sent to it until staff fix it.
    unreachable: "We can't email your MP at the moment: their address isn't working.",
  },
  form: {
    emailLabel: "Your email",
    subjectLabel: "Subject",
    letterLabel: "Message",
    tips: ["Customise the email to yourself and your MP", "MPs are very busy - keep it short!"],
    attachments: "Attachments",
    // Goes to the preview page.
    preview: "Preview",
    emailRequired: "Please fill in your email address.",
    // When the browser won't keep the draft, so there's no preview to go to.
    storageFailed: "Sorry! Something went wrong with your browser, the message wasn't saved.",
  },
  // The page for writing the letter, after finding the MP.
  write: {
    title: "Write your letter",
    // Opened with no MP looked up in this browser: straight from a link, say.
    none: "Find your MP first.",
  },
  // The page between the form and sending: the letter exactly as it will go.
  preview: {
    title: "Check your letter",
    to: "To",
    edit: "Edit",
    consent: "Tell me about events where I can talk to my MP and ways to help PauseAI",
    replyNotice: "A copy of the letter and responses will be sent to PauseAI UK.",
    send: "Send email",
    sending: "Sending",
    networkError: "Network error - please try again.",
    // Opened with no letter in this browser: straight from a link, say.
    none: "You haven't written a letter yet.",
    backToForm: "Go back to campaign",
  },
  // The page after sending, in place of the form.
  sent: {
    title: "Thank you!",
    body: (mpName: string) => `Your letter has been sent to ${mpName}.`,
    // Under that, a paragraph of its own.
    more: "Please do ask your friends to write to their MPs too, or come along to a PauseAI event.",
    // Opened without having just sent one.
    none: "No letter has been sent recently.",
  },
  // The note on a copy of an MP's reply, sent to the shared inbox and the sender.
  forwardedReply: {
    subject: (subject: string) => `Response: ${subject}`,
    note: (mpName: string, senderName: string) =>
      `${mpName} replied to the letter that ${senderName} sent. Here is the response:`,
  },
  // The bill's page, for an MP who signed ControlAI's letter to the PM
  // backing it (lib/controlai-letter.ts): the note above the form, and the
  // paragraph in the letter that thanks them, before asking them to the debate.
  sobelBill: {
    // The note, with a link to the letter in the middle.
    signedNote: {
      before: "Good news! Your MP is a public supporter of the Artificial Superintelligence Bill, they've signed the ",
      link: "ControlAI letter",
      after: ". Please still thank them for this, and encourage them to attend the debate of the Bill.",
    },
    letterThanks: "Thank you for signing the ControlAI letter to the Prime Minister in support of the Bill.",
  },
  // Errors the server sends back to the form.
  errors: {
    missingFields: "All fields are required.",
    invalidEmail: "That email address doesn't look correct.",
    unknownCampaign: "Unknown campaign.",
    noRecipient: "We couldn't send the letter, because we don't have a valid email address for your MP.",
    testMpOnly: "You can only write to the test MP here.",
    alreadySent: "You've already written to your MP about this.",
    // The MP's address bounced since they looked them up.
    unreachable: "Your letter wasn't sent, because your MP's email address isn't working. We've told our team.",
    failed: "Sorry! We failed to send the email, for technical reasons.",
    spamUnavailable: "Spam protection is unavailable.",
    spamMisconfigured: "Spam protection is misconfigured.",
    spamWait: "Please wait for the anti-spam check to complete, then send your message again.",
    spamFailed: "The anti-spam check failed. Please reload the page and try again.",
    spamUnreachable: "Could not complete the anti-spam check. Please try again in a moment.",
    turnstileLoad: "The anti-spam check could not load. Please refresh the page and try again.",
  },
};
