// The Email your MP campaigns, and every word the tool shows or sends.
//
// Where the old tool (pauseai.info/uk-email-mp, embedded on /campaigns)
// already says the same thing, this uses its words. Everything else is
// placeholder copy (AGENTS.md: "Never write final copy"), marked with ⁂ and
// written in Latin: Francis writes the real words and Joseph approves them,
// and placeholder-copy.test.ts fails until they're in.

/** What the MP has done for one campaign, as recorded by the policy team. */
export type CampaignStatus = "signed" | "supports";

/** What a letter needs to know about who it's from and who it's to. */
export type LetterDetails = {
  /** "Ms Abbott". */
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
  /** The URL is /campaigns-v2/<slug>. Letters and MP statuses in the database are keyed by it. */
  slug: string;
  title: string;
  description: string;
  /** The status that means this MP has done what the campaign asks. */
  done: CampaignStatus;
  subject: string;
  /**
   * The letter to an MP who hasn't done it yet, up to the sign-off. The
   * sender's name and address follow it (lib/email-your-mp.ts).
   */
  letter: (details: LetterDetails) => string;
  /** The letter to an MP who already has: it thanks them. */
  thanks: (details: LetterDetails) => string;
  /** Shown above the form when the MP has already done it. */
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
    slug: "regulate-pm-letter",
    title: "⁂ Epistula ad primum ministrum",
    description: "⁂ Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    done: "signed",
    subject: "Request to co-sign letter on frontier AI risks",
    // The old tool's letter, without its Markdown bold: letters are plain text.
    letter: (d) =>
      `Dear ${d.salutation}\n\nI’m a resident of ${d.constituency} and a supporter of PauseAI, a civic movement focused on averting the risks of superhuman AI. I am very concerned that AI development is racing ahead without adequate protection for the public.\n\nAI now poses an extremely serious risk to our national security. Parliamentarians in the United Kingdom, and politicians around the globe are moving to answer the call from AI developers, Nobel Laureates and concerned citizens to regulate AI immediately.\n\nThe UK has no specific legal standards for frontier AI safety. No regulator oversees frontier AI development. And UK law does not reliably hold developers liable for damage or deaths caused by their models, even when the danger is predictable, preventable and uniquely enabled by AI.\n\nPlease could you add your name to PauseAI's open letter (attached) in support of frontier AI legislation? And could we arrange a short meeting to discuss this important matter?\n\nThank you for your consideration,`,
    thanks: (d) =>
      `⁂ Care ${d.salutation},\n\nGratias tibi ago quod epistulam subscripsisti. Lorem ipsum dolor sit amet, ${d.constituency} consectetur adipiscing elit.\n\nVale,`,
    alreadyDone: "Already signed! This MP has already signed the Frontier AI letter.",
    movedOn: "⁂ Senator tuus epistulam iam subscripsit, itaque hanc tibi ostendimus.",
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
    description: "⁂ Duis aute irure dolor in reprehenderit in voluptate velit esse.",
    done: "supports",
    subject: "⁂ Rogamus ut legem sustineas",
    letter: (d) =>
      `⁂ Care ${d.salutation},\n\nDuis aute irure dolor in reprehenderit, ${d.constituency} in voluptate velit esse cillum dolore.\n\nExcepteur sint occaecat cupidatat non proident.\n\nGratias tibi ago,`,
    thanks: (d) =>
      `⁂ Care ${d.salutation},\n\nGratias tibi ago quod legem sustines. Duis aute irure dolor, ${d.constituency} in reprehenderit.\n\nVale,`,
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
    noMp: "⁂ Nullum senatorem pro hac regione invenimus.",
    failed: "Something went wrong on our end. Please try again in a moment.",
    mpOf: (constituency: string) => `MP for ${constituency}`,
    // Outside production only, under the form: "ZZ9 9ZZ (Testy McTestface MP), ...".
    testPostcodes: (mps: string) => `⁂ Codices postales probationis: ${mps}`,
    noEmail: "⁂ Nulla inscriptio electronica nota est.",
  },
  form: {
    emailLabel: "Your email",
    addressLabel: "⁂ Inscriptio postalis tua",
    addressHint: "⁂ In subscriptione epistulae ponetur.",
    subjectLabel: "Subject",
    letterLabel: "Message",
    attachments: "Attachments",
    consent: "Tell me about events where I can talk to my MP and ways to help PauseAI",
    replyNotice: "⁂ Exemplar cuiusque responsi ad PauseAI UK veniet.",
    send: "Send Email",
    sending: "Sending",
    confirmPrompt: (mpName: string) => `Send this email to ${mpName}?`,
    cancel: "Cancel",
    confirmSend: "Confirm & Send",
    emailRequired: "Please fill in your email address",
    addressRequired: "⁂ Inscriptionem postalem scribe.",
    checkInbox: "⁂ Inspice cistam tuam: nexum ibi clicca ut epistulam mittas.",
    networkError: "Network error - please try again",
  },
  // The email that asks the sender to confirm, with the link that sends the letter.
  confirmationEmail: {
    subject: "⁂ Confirma epistulam tuam",
    body: (senderName: string, mpName: string, link: string) =>
      `⁂ Salve ${senderName},\n\nUt epistulam tuam ad ${mpName} mittas, hunc nexum clicca:\n\n${link}\n\nSi hanc epistulam non scripsisti, hunc nuntium neglege.\n\nPauseAI UK`,
  },
  // The page the confirmation link opens.
  confirm: {
    title: "⁂ Epistulam mittimus",
    sending: "⁂ Epistulam tuam mittimus...",
    sent: (mpName: string) => `⁂ Epistula tua ad ${mpName} missa est. Gratias!`,
    invalid: "⁂ Hic nexus iam usus est aut exspiravit.",
    failed: "⁂ Epistulam mittere non potuimus. Nexum iterum clicca.",
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
    invalidEmail: "⁂ Inscriptio electronica non valet.",
    unknownCampaign: "⁂ Hanc causam non novimus.",
    noRecipient: "Invalid recipient email",
    testMpOnly: "⁂ Hic tantum ad senatorem probationis scribere licet.",
    tooManyConfirmations: "Too many requests. Please try again later.",
    failed: "Failed to send email",
    spamUnavailable: "Spam protection is unavailable. Please email contact@pauseai.info instead.",
    spamMisconfigured: "Spam protection is misconfigured. Please email contact@pauseai.info instead.",
    spamWait: "Please wait for the anti-spam check to complete, then send your message again.",
    spamFailed: "The anti-spam check failed. Please reload the page and try again.",
    spamUnreachable: "Could not complete the anti-spam check. Please try again in a moment.",
    turnstileLoad: "The anti-spam check could not load. Please refresh the page and try again.",
  },
};
