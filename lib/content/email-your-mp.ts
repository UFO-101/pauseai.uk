// The Email your MP campaigns: what the form and the server need to know about
// each, and every word the tool shows or sends. Each campaign's page has its
// own words (app/(site)/campaigns-v2/<slug>/page.tsx).

/** What the MP has done for one campaign, as recorded by the policy team. */
export type CampaignStatus = "signed" | "supports";

/** What a letter needs to know about who it's from and who it's to. */
export type LetterDetails = {
  /** "Ms Dummy". */
  salutation: string;
  constituency: string;
  senderName: string;
};

export type Attachment = {
  /** File name in public/pdfs/. */
  file: string;
  /** Thumbnail in public/pdfs/, shown on the form. */
  thumbnail: string;
  title: string;
  subtitle: string;
};

export type Campaign = {
  /**
   * The page is app/(site)/campaigns-v2/<slug>/page.tsx, which has the
   * page's own words. Letters and MP statuses in the database are keyed by it.
   */
  slug: string;
  /** Its name in the staff interface. */
  title: string;
  /** The status that means this MP has done what the campaign asks. */
  done: CampaignStatus;
  subject: string;
  /**
   * The letter to an MP who hasn't done it yet, up to the sign-off. The
   * sender's name and address follow it (lib/email-your-mp.ts). A blank line
   * between paragraphs, **bold**, _italic_, and "- " for bullets
   * (lib/letter-format.ts).
   */
  letter: (details: LetterDetails) => string;
  /**
   * Shown instead of the form when the MP has already done it but the page
   * couldn't move on, because the browser wouldn't keep the lookup.
   */
  alreadyDone: string;
  /**
   * Shown on the next campaign's page when this one's page has moved on to
   * it, because the MP had already done this.
   */
  movedOn: string;
  attachments: Attachment[];
};

/**
 * In priority order. Plain /campaigns-v2 redirects to the first, and a
 * campaign's page moves on to the first one the MP hasn't done.
 */
export const campaigns: Campaign[] = [
  {
    slug: "regulate-letter-pm",
    title: "Regulate AI developers now",
    done: "signed",
    subject: "Request to co-sign letter on frontier AI risks",
    // The old tool's letter.
    letter: (d) =>
      `Dear ${d.salutation}\n\nI’m a resident of ${d.constituency} and a supporter of **PauseAI**, a civic movement focused on averting the risks of superhuman AI. I am very concerned that AI development is racing ahead without adequate protection for the public.\n\nAI now poses an extremely serious risk to our national security. Parliamentarians in the United Kingdom, and politicians around the globe are moving to answer the call from AI developers, Nobel Laureates and concerned citizens to regulate AI immediately.\n\n**The UK has no specific legal standards for frontier AI safety.** No regulator oversees frontier AI development. And UK law does not reliably hold developers liable for damage or deaths caused by their models, even when the danger is predictable, preventable and uniquely enabled by AI.\n\nPlease could you add your name to PauseAI's open letter (attached) in support of frontier AI legislation? And could we arrange a short meeting to discuss this important matter?\n\nThank you for your consideration,`,
    alreadyDone: "Already signed! This MP has already signed the Frontier AI letter.",
    movedOn: "Good news! Your MP has already signed the letter to the PM. You can write to them about this instead.",
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
    title: "⁂ Lex Alexandri Sobel",
    done: "supports",
    subject: "⁂ Rogamus ut legem sustineas",
    letter: (d) =>
      `⁂ Care ${d.salutation},\n\nDuis aute irure dolor in reprehenderit, ${d.constituency} in voluptate velit esse cillum dolore.\n\nExcepteur sint occaecat cupidatat non proident.\n\nGratias tibi ago,`,
    alreadyDone: "⁂ Senator tuus iam legem sustinet.",
    movedOn: "⁂ Senator tuus legem iam sustinet, itaque hanc tibi ostendimus.",
    // The bill's PDFs aren't written yet (plans/email-your-mp-v2.md, "Tasks for Francis").
    attachments: [],
  },
];

/** The form, its messages, and the page around it. */
export const copy = {
  pageTitle: "Email Your MP",
  pageDescription: "Contact your Member of Parliament about AI safety",
  lookup: {
    nameLabel: "Your Name",
    postcodeLabel: "Your Postcode",
    button: "Find My MP",
    looking: "Looking up",
    nameRequired: "Please enter your name",
    postcodeRequired: "Please enter a postcode",
    notFound: "Postcode not found",
    noConstituency: "No parliamentary constituency found for this postcode",
    noMp: "No MP found for your constituency.",
    failed: "Something went wrong on our end. Please try again in a moment.",
    // Above the MP's name, once found.
    yourMp: "Your MP",
    mpOf: (constituency: string) => `MP for ${constituency}`,
    // Outside production only, under the form: "ZZ9 9ZZ (Testy McTestface MP), ...".
    testPostcodes: (mps: string) => `⁂ Codices postales probationis: ${mps}`,
    noEmail: "No email found for your MP.",
    // Instead of the form, when the MP has done every campaign.
    allDone: "⁂ Senator tuus omnes causas iam sustinet.",
  },
  form: {
    emailLabel: "Your email",
    addressLabel: "Your postal address",
    // Says the address goes at the end of the letter, under their name.
    addressHint: "You need to give your real address, as MPs only reply to their constituents.",
    subjectLabel: "Subject",
    letterLabel: "Message",
    tips: ["Customise the email to yourself and your MP", "MPs are very busy - keep it short!"],
    attachments: "Attachments",
    // Goes to the preview page.
    preview: "Preview",
    emailRequired: "Please fill in your email address.",
    addressRequired: "Please fill in your postal address.",
    // When the browser won't keep the draft, so there's no preview to go to.
    storageFailed: "⁂ Navigatrum tuum epistulam servare non potest.",
  },
  // The page for writing the letter, after finding the MP.
  write: {
    title: "Write your letter",
    // Opened with no MP looked up in this browser: straight from a link, say.
    none: "Find your MP first",
  },
  // The page between the form and sending: the letter exactly as it will go.
  preview: {
    title: "Check your letter",
    to: "To",
    edit: "Edit",
    consent: "Tell me about events where I can talk to my MP and ways to help PauseAI",
    replyNotice: "A copy of the letter and responses will be sent to PauseAI UK.",
    send: "Send Email",
    sending: "Sending",
    networkError: "Network error - please try again",
    // Opened with no letter in this browser: straight from a link, say.
    none: "⁂ Nulla epistula hic est.",
    backToForm: "⁂ Ad formam redi",
  },
  // The page after sending, in place of the form.
  sent: {
    title: "⁂ Gratias tibi!",
    body: (mpName: string) => `⁂ Epistula tua ad ${mpName} missa est.`,
    // Opened without having just sent one.
    none: "⁂ Nulla epistula nuper missa est.",
  },
  // The note on a copy of an MP's reply, sent to the shared inbox and the sender.
  forwardedReply: {
    subject: (subject: string) => `⁂ Responsum: ${subject}`,
    note: (mpName: string, senderName: string) =>
      `⁂ ${mpName} ad epistulam quam ${senderName} misit respondit. Ecce responsum.`,
  },
  // Errors the server sends back to the form.
  errors: {
    missingFields: "All fields are required",
    invalidEmail: "That email address doesn't look correct.",
    unknownCampaign: "Unknown campaign.",
    noRecipient: "Invalid recipient email",
    testMpOnly: "You can only write to the test MP here.",
    alreadySent: "You've already written to your MP about this.",
    failed: "Failed to send email",
    spamUnavailable: "Spam protection is unavailable. Please email contact@pauseai.info instead.",
    spamMisconfigured: "Spam protection is misconfigured. Please email contact@pauseai.info instead.",
    spamWait: "Please wait for the anti-spam check to complete, then send your message again.",
    spamFailed: "The anti-spam check failed. Please reload the page and try again.",
    spamUnreachable: "Could not complete the anti-spam check. Please try again in a moment.",
    turnstileLoad: "The anti-spam check could not load. Please refresh the page and try again.",
  },
};
