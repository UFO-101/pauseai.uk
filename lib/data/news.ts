export type NewsItem = {
  logoSrc?: string;
  logoAlt: string;
  logoHtml?: string;
  /** Desktop render height in px. Chosen per logo so every mark carries
      roughly equal visual area (height ∝ 1/√aspect-ratio): wide wordmarks
      get shorter, square marks get taller. Defaults to 44 in CSS. */
  logoHeight?: number;
  /** Intrinsic pixel dimensions of logoSrc (its viewBox/natural size, not
      the rendered size) — required by next/image for aspect ratio; actual
      display size is still driven by the logoHeight CSS var. */
  logoIntrinsicWidth?: number;
  logoIntrinsicHeight?: number;
  title: string;
  url: string;
};

const ALL_NEWS: NewsItem[] = [
  {
    logoSrc: "/images/media-coverage/Financial_Times_corporate_logo.svg",
    logoAlt: "Financial Times",
    logoHeight: 56,
    logoIntrinsicWidth: 228,
    logoIntrinsicHeight: 311,
    title: "Peter Kyle agreed to include 'more positive language' in AI speech after Mandelson's advice",
    url: "https://www.ft.com/content/1b3e3117-b979-4187-b983-c785d230c09b",
  },
  {
    logoSrc: "/images/media-coverage/Wired_logo.svg",
    logoAlt: "Wired Italia",
    logoHeight: 35,
    logoIntrinsicWidth: 125,
    logoIntrinsicHeight: 25,
    title: "Movements against AI are growing — inside the groups trying to stop it",
    url: "https://www.wired.it/article/movimenti-contro-intelligenza-artificiale-mappa-nomi-pauseai-stopai-controlai/",
  },
  {
    logoSrc: "/images/media-coverage/Cosmopolitan_logo.svg",
    logoAlt: "Cosmopolitan Italia",
    logoHeight: 33,
    logoIntrinsicWidth: 600,
    logoIntrinsicHeight: 106,
    title: "Gen Z is losing faith in AI — and protest movements are growing",
    url: "https://www.cosmopolitan.com/it/lifecoach/news-attualita/a71455730/gen-z-paura-intelligenza-artificiale-ansia/",
  },
  {
    logoSrc: "/images/media-coverage/Gizmodo_logo.svg",
    logoAlt: "Gizmodo",
    logoHeight: 33,
    logoIntrinsicWidth: 186,
    logoIntrinsicHeight: 36,
    title: "The OpenAI–Anthropic Cold War Comes to Illinois",
    url: "https://gizmodo.com/the-openai-anthropic-cold-war-comes-to-illinois-2000746324",
  },
  {
    logoSrc: "/images/media-coverage/wall-street-journal-logo.png",
    logoAlt: "Wall Street Journal",
    logoHeight: 26,
    logoIntrinsicWidth: 777,
    logoIntrinsicHeight: 67,
    title: "AI Giants Go on Charm Offensive to Avert Public Backlash",
    url: "https://www.wsj.com/tech/ai/ai-companies-public-relations-ae312d79",
  },
  {
    logoSrc: "/images/media-coverage/Business_Insider_Logo.svg",
    logoAlt: "Business Insider",
    logoHeight: 43,
    logoIntrinsicWidth: 103,
    logoIntrinsicHeight: 32,
    title: "Protesters accuse Google DeepMind of breaking AI safety promises",
    url: "https://www.businessinsider.com/protesters-accuse-google-deepmind-breaking-promises-ai-safety-2025-6",
  },
  {
    logoSrc: "/images/media-coverage/Time_Magazine_logo.svg",
    logoAlt: "TIME",
    logoHeight: 42,
    logoIntrinsicWidth: 298,
    logoIntrinsicHeight: 92,
    title: "60 U.K. lawmakers accuse Google of breaking AI safety pledge",
    url: "https://time.com/7313320/google-deepmind-gemini-ai-safety-pledge/",
  },
  {
    logoSrc: "/images/media-coverage/Fortune_magazine_logo.svg",
    logoAlt: "Fortune",
    logoHeight: 37,
    logoIntrinsicWidth: 90,
    logoIntrinsicHeight: 21,
    title: "Lawmakers press Google DeepMind over delayed safety report",
    url: "https://fortune.com/2025/08/29/british-lawmakers-accuse-google-deepmind-of-breach-of-trust-over-delayed-gemini-2-5-pro-safety-report/",
  },
  {
    logoSrc: "/images/media-coverage/MIT_Technology_Review_modern_logo.svg",
    logoAlt: "MIT Technology Review",
    logoHeight: 54,
    logoIntrinsicWidth: 184,
    logoIntrinsicHeight: 92,
    title: "I checked out one of the biggest anti-AI protests yet",
    url: "https://www.technologyreview.com/2026/03/02/1133814/i-checked-out-londons-biggest-ever-anti-ai-protest/",
  },
  {
    logoSrc: "/images/media-coverage/The_Guardian_Logo.svg",
    logoAlt: "The Guardian",
    logoHeight: 44,
    logoIntrinsicWidth: 295,
    logoIntrinsicHeight: 97,
    title: "UK arts must not be sacrificed for speculative AI gains, peers say",
    url: "https://www.theguardian.com/technology/2026/mar/06/uk-arts-must-not-be-sacrificed-for-speculative-ai-gains-peers-say",
  },
  {
    logoSrc: "/images/media-coverage/the-observer-logo.svg",
    logoAlt: "The Observer",
    logoHeight: 30,
    logoIntrinsicWidth: 980,
    logoIntrinsicHeight: 157,
    title: "Endgame: Can we live with Artificial General Intelligence?",
    url: "https://lnk.to/5cnSAU",
  },
  {
    logoSrc: "/images/media-coverage/BBC_Logo_2021.svg",
    logoAlt: "BBC",
    logoHeight: 40,
    logoIntrinsicWidth: 560,
    logoIntrinsicHeight: 160,
    title: "Hundreds of people march for tighter controls on AI",
    url: "https://youtu.be/-0CRojvk1FE?t=146",
  },
  {
    logoSrc: "/images/media-coverage/The_Independent_Logo.png",
    logoAlt: "The Independent",
    logoHeight: 26,
    logoIntrinsicWidth: 540,
    logoIntrinsicHeight: 38,
    title: "Pro-human AI declaration gains diverse support amid calls for stronger safety measures",
    url: "https://www.independent.co.uk/tech/ai-safety-declaration-steve-bannon-b2932570.html",
  },
  {
    logoSrc: "/images/media-coverage/Futurism_Logo.svg",
    logoAlt: "Futurism",
    logoHeight: 33,
    logoIntrinsicWidth: 489,
    logoIntrinsicHeight: 93,
    title: "The rage at OpenAI has grown so immense that there are entire protests against it",
    url: "https://futurism.com/artificial-intelligence/rage-openai-protests",
  },
  {
    logoSrc: "/images/media-coverage/Real_Media_Logo.png",
    logoAlt: "Real Media",
    logoHeight: 52,
    logoIntrinsicWidth: 94,
    logoIntrinsicHeight: 83,
    title: "Pull the plug — Pause AI: a timely call for urgent regulation",
    url: "https://realmedia.press/pull-the-plug",
  },
  {
    logoHtml: '<span class="news-logo-text news-logo-text--swlondoner"><span class="sw">SW</span>Londoner</span>',
    logoAlt: "SW Londoner",
    title: "Pressing pause on AI: London activists to march in largest AI safety protest yet",
    url: "https://www.swlondoner.co.uk/news/27022026-pressing-pause-on-ai-london-activists-to-march-in-largest-ai-safety-protest-yet",
  },
  {
    logoSrc: "/images/media-coverage/Politis_Logo.png",
    logoAlt: "Politis",
    logoHeight: 43,
    logoIntrinsicWidth: 180,
    logoIntrinsicHeight: 58,
    title: "L'image : à Londres, une marche contre l'IA",
    url: "https://www.politis.fr/articles/2026/03/limage-a-londres-une-marche-contre-lia/",
  },
  {
    logoSrc: "/images/media-coverage/Daily_Mail_masthead.svg",
    logoAlt: "Daily Mail",
    logoHeight: 31,
    logoIntrinsicWidth: 1000,
    logoIntrinsicHeight: 158,
    title: "When given a choice, AI opts for self-preservation over human life — and that should terrify us all",
    url: "https://www.dailymail.com/debate/article-16032063/AI-opts-self-preservation-human-life.html",
  },
  {
    logoSrc: "/images/media-coverage/New_Statesman_magazine_logo.svg",
    logoAlt: "New Statesman",
    logoHeight: 30,
    logoIntrinsicWidth: 524,
    logoIntrinsicHeight: 80,
    title: "The anti-AI revolt is here",
    url: "https://www.newstatesman.com/politics/society/2026/08/the-anti-ai-revolt-is-here",
  },
];

// Desktop: 2 rows (10 + 10). Mobile (handled in page.tsx): 3 rows so
// each row is shorter and easier to scan on a narrow viewport.
export const newsRow1 = ALL_NEWS.slice(0, 10);
export const newsRow2 = ALL_NEWS.slice(10);

export const newsMobileRow1 = ALL_NEWS.slice(0, 7);
export const newsMobileRow2 = ALL_NEWS.slice(7, 14);
export const newsMobileRow3 = ALL_NEWS.slice(14);

export const news = ALL_NEWS;
