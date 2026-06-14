export type NewsItem = {
  logoSrc?: string;
  logoAlt: string;
  logoHtml?: string;
  /** Desktop render height in px. Chosen per logo so every mark carries
      roughly equal visual area (height ∝ 1/√aspect-ratio): wide wordmarks
      get shorter, square marks get taller. Defaults to 44 in CSS. */
  logoHeight?: number;
  title: string;
  url: string;
};

const ALL_NEWS: NewsItem[] = [
  {
    logoSrc: "/images/media-coverage/Financial_Times_corporate_logo.svg",
    logoAlt: "Financial Times",
    logoHeight: 56,
    title: "Peter Kyle agreed to include 'more positive language' in AI speech after Mandelson's advice",
    url: "https://www.ft.com/content/1b3e3117-b979-4187-b983-c785d230c09b",
  },
  {
    logoSrc: "/images/media-coverage/Wired_logo.svg",
    logoAlt: "Wired Italia",
    logoHeight: 35,
    title: "Movements against AI are growing — inside the groups trying to stop it",
    url: "https://www.wired.it/article/movimenti-contro-intelligenza-artificiale-mappa-nomi-pauseai-stopai-controlai/",
  },
  {
    logoSrc: "/images/media-coverage/Cosmopolitan_logo.svg",
    logoAlt: "Cosmopolitan Italia",
    logoHeight: 33,
    title: "Gen Z is losing faith in AI — and protest movements are growing",
    url: "https://www.cosmopolitan.com/it/lifecoach/news-attualita/a71455730/gen-z-paura-intelligenza-artificiale-ansia/",
  },
  {
    logoSrc: "/images/media-coverage/Gizmodo_logo.svg",
    logoAlt: "Gizmodo",
    logoHeight: 33,
    title: "The OpenAI–Anthropic Cold War Comes to Illinois",
    url: "https://gizmodo.com/the-openai-anthropic-cold-war-comes-to-illinois-2000746324",
  },
  {
    logoSrc: "/images/media-coverage/wall-street-journal-logo.png",
    logoAlt: "Wall Street Journal",
    logoHeight: 26,
    title: "AI Giants Go on Charm Offensive to Avert Public Backlash",
    url: "https://www.wsj.com/tech/ai/ai-companies-public-relations-ae312d79",
  },
  {
    logoSrc: "/images/media-coverage/Business_Insider_Logo.svg",
    logoAlt: "Business Insider",
    logoHeight: 43,
    title: "Protesters accuse Google DeepMind of breaking AI safety promises",
    url: "https://www.businessinsider.com/protesters-accuse-google-deepmind-breaking-promises-ai-safety-2025-6",
  },
  {
    logoSrc: "/images/media-coverage/Time_Magazine_logo.svg",
    logoAlt: "TIME",
    logoHeight: 42,
    title: "60 U.K. lawmakers accuse Google of breaking AI safety pledge",
    url: "https://time.com/7313320/google-deepmind-gemini-ai-safety-pledge/",
  },
  {
    logoSrc: "/images/media-coverage/Fortune_magazine_logo.svg",
    logoAlt: "Fortune",
    logoHeight: 37,
    title: "Lawmakers press Google DeepMind over delayed safety report",
    url: "https://fortune.com/2025/08/29/british-lawmakers-accuse-google-deepmind-of-breach-of-trust-over-delayed-gemini-2-5-pro-safety-report/",
  },
  {
    logoSrc: "/images/media-coverage/MIT_Technology_Review_modern_logo.svg",
    logoAlt: "MIT Technology Review",
    logoHeight: 54,
    title: "I checked out one of the biggest anti-AI protests yet",
    url: "https://www.technologyreview.com/2026/03/02/1133814/i-checked-out-londons-biggest-ever-anti-ai-protest/",
  },
  {
    logoSrc: "/images/media-coverage/The_Guardian_Logo.svg",
    logoAlt: "The Guardian",
    logoHeight: 44,
    title: "UK arts must not be sacrificed for speculative AI gains, peers say",
    url: "https://www.theguardian.com/technology/2026/mar/06/uk-arts-must-not-be-sacrificed-for-speculative-ai-gains-peers-say",
  },
  {
    logoSrc: "/images/media-coverage/the-observer-logo.svg",
    logoAlt: "The Observer",
    logoHeight: 30,
    title: "Endgame: Can we live with Artificial General Intelligence?",
    url: "https://lnk.to/5cnSAU",
  },
  {
    logoSrc: "/images/media-coverage/BBC_Logo_2021.svg",
    logoAlt: "BBC",
    logoHeight: 40,
    title: "Hundreds of people march for tighter controls on AI",
    url: "https://www.youtube.com/watch?v=-0CRojvk1FE",
  },
  {
    logoSrc: "/images/media-coverage/The_Independent_Logo.png",
    logoAlt: "The Independent",
    logoHeight: 26,
    title: "Pro-human AI declaration gains diverse support amid calls for stronger safety measures",
    url: "https://www.independent.co.uk/tech/ai-safety-declaration-steve-bannon-b2932570.html",
  },
  {
    logoSrc: "/images/media-coverage/Futurism_Logo.svg",
    logoAlt: "Futurism",
    logoHeight: 33,
    title: "The rage at OpenAI has grown so immense that there are entire protests against it",
    url: "https://futurism.com/artificial-intelligence/rage-openai-protests",
  },
  {
    logoSrc: "/images/media-coverage/Real_Media_Logo.png",
    logoAlt: "Real Media",
    logoHeight: 52,
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
    title: "L'image : à Londres, une marche contre l'IA",
    url: "https://www.politis.fr/articles/2026/03/limage-a-londres-une-marche-contre-lia/",
  },
];

// Desktop: 2 rows (9 + 7). Mobile (handled in page.tsx): 3 rows so
// each row is shorter and easier to scan on a narrow viewport.
export const newsRow1 = ALL_NEWS.slice(0, 9);
export const newsRow2 = ALL_NEWS.slice(9);

export const newsMobileRow1 = ALL_NEWS.slice(0, 6);
export const newsMobileRow2 = ALL_NEWS.slice(6, 11);
export const newsMobileRow3 = ALL_NEWS.slice(11);

export const news = ALL_NEWS;
