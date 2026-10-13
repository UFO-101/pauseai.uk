// The Email your MP campaigns, and every word the tool shows or sends.
//
// All of this is placeholder copy (AGENTS.md: "Never write final copy"),
// marked with ⁂ and written in Latin. Francis writes the real words and
// Joseph approves them; placeholder-copy.test.ts fails until they're in.

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
  /** The URL is /email-your-mp-v2/<slug>. */
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
  attachments: Attachment[];
};

/** In priority order: plain /email-your-mp-v2 picks the first one the MP hasn't done. */
export const campaigns: Campaign[] = [
  {
    slug: "letter-to-the-prime-minister",
    title: "⁂ Epistula ad primum ministrum",
    description: "⁂ Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    done: "signed",
    subject: "⁂ Rogamus ut epistulam subscribas",
    letter: (d) =>
      `⁂ Care ${d.salutation},\n\nLorem ipsum dolor sit amet, ${d.constituency} consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n\nGratias tibi ago,`,
    thanks: (d) =>
      `⁂ Care ${d.salutation},\n\nGratias tibi ago quod epistulam subscripsisti. Lorem ipsum dolor sit amet, ${d.constituency} consectetur adipiscing elit.\n\nVale,`,
    alreadyDone: "⁂ Senator tuus iam subscripsit.",
    attachments: [
      {
        file: "Frontier-AI-Open-Letter.pdf",
        thumbnail: "Frontier-AI-Open-Letter.jpg",
        title: "⁂ Epistula aperta",
        subtitle: "⁂ Ad primum ministrum",
      },
      {
        file: "Frontier-AI-Risks-Policy-Briefing.pdf",
        thumbnail: "Frontier-AI-Risks-Policy-Briefing.jpg",
        title: "⁂ Libellus consilii",
        subtitle: "⁂ De periculis",
      },
    ],
  },
  {
    slug: "support-the-bill",
    title: "⁂ Lex Alexandri Sobel",
    description: "⁂ Duis aute irure dolor in reprehenderit in voluptate velit esse.",
    done: "supports",
    subject: "⁂ Rogamus ut legem sustineas",
    letter: (d) =>
      `⁂ Care ${d.salutation},\n\nDuis aute irure dolor in reprehenderit, ${d.constituency} in voluptate velit esse cillum dolore.\n\nExcepteur sint occaecat cupidatat non proident.\n\nGratias tibi ago,`,
    thanks: (d) =>
      `⁂ Care ${d.salutation},\n\nGratias tibi ago quod legem sustines. Duis aute irure dolor, ${d.constituency} in reprehenderit.\n\nVale,`,
    alreadyDone: "⁂ Senator tuus iam legem sustinet.",
    // The bill's PDFs aren't written yet (plans/email-your-mp-v2.md, "Tasks for Francis").
    attachments: [],
  },
];

/** The form, its messages, and the page around it. */
export const copy = {
  pageTitle: "⁂ Scribe senatori tuo",
  pageDescription: "⁂ Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  lookup: {
    nameLabel: "⁂ Nomen tuum",
    postcodeLabel: "⁂ Codex postalis",
    button: "⁂ Quaere senatorem",
    looking: "⁂ Quaerimus",
    nameRequired: "⁂ Nomen tuum scribe.",
    postcodeRequired: "⁂ Codicem postalem scribe.",
    notFound: "⁂ Codicem postalem non invenimus.",
    noConstituency: "⁂ Nullam regionem pro hoc codice invenimus.",
    noMp: "⁂ Nullum senatorem pro hac regione invenimus.",
    failed: "⁂ Aliquid erravit. Iterum conare.",
    mpOf: (constituency: string) => `⁂ Senator pro ${constituency}`,
    noEmail: "⁂ Nulla inscriptio electronica nota est.",
  },
  form: {
    emailLabel: "⁂ Inscriptio electronica tua",
    addressLabel: "⁂ Inscriptio postalis tua",
    addressHint: "⁂ In subscriptione epistulae ponetur.",
    subjectLabel: "⁂ Titulus",
    letterLabel: "⁂ Epistula",
    attachments: "⁂ Adiuncta",
    consent: "⁂ Nuntia mihi de eventibus et modis PauseAI adiuvandi.",
    replyNotice: "⁂ Exemplar cuiusque responsi ad PauseAI UK veniet.",
    send: "⁂ Mitte epistulam",
    sending: "⁂ Mittimus",
    confirmPrompt: (mpName: string) => `⁂ Epistulamne ad ${mpName} mittis?`,
    cancel: "⁂ Desine",
    confirmSend: "⁂ Confirma et mitte",
    emailRequired: "⁂ Inscriptionem electronicam scribe.",
    addressRequired: "⁂ Inscriptionem postalem scribe.",
    sent: (mpName: string) => `⁂ Epistula tua ad ${mpName} missa est.`,
    checkInbox: "⁂ Inspice cistam tuam: nexum ibi clicca ut epistulam mittas.",
    networkError: "⁂ Retis erravit. Iterum conare.",
  },
  // Errors the server sends back to the form.
  errors: {
    missingFields: "⁂ Omnes partes scribe.",
    invalidEmail: "⁂ Inscriptio electronica non valet.",
    unknownCampaign: "⁂ Hanc causam non novimus.",
    noRecipient: "⁂ Huic senatori scribere non possumus.",
    tooManyConfirmations: "⁂ Nimis multae epistulae hodie. Cras iterum conare.",
    failed: "⁂ Epistulam mittere non potuimus. Iterum conare.",
    spamUnavailable: "⁂ Tutela contra spam abest. Scribe ad hello@pauseai.uk.",
    spamMisconfigured: "⁂ Tutela contra spam male parata est. Scribe ad hello@pauseai.uk.",
    spamWait: "⁂ Exspecta dum probatio finiatur, deinde iterum mitte.",
    spamFailed: "⁂ Probatio contra spam defecit. Paginam renova et iterum conare.",
    spamUnreachable: "⁂ Probationem perficere non potuimus. Mox iterum conare.",
    turnstileLoad: "⁂ Probatio contra spam onerari non potuit. Paginam renova.",
  },
};
