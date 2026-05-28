export type NewsItem = {
  logoSrc?: string;
  logoAlt: string;
  logoWidth?: number;
  logoHeight?: number;
  logoHtml?: string;
  title: string;
  url: string;
  linkText: string;
};

export const news: NewsItem[] = [
  {
    logoSrc: "/images/media-coverage/wall-street-journal-logo.png",
    logoAlt: "Wall Street Journal",
    logoWidth: 863,
    logoHeight: 80,
    title: "AI Giants Go on Charm Offensive to Avert Public Backlash",
    url: "https://www.wsj.com/tech/ai/ai-companies-public-relations-ae312d79",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/Business_Insider_Logo.svg",
    logoAlt: "Business Insider",
    title: "Protesters accuse Google DeepMind of breaking AI safety promises",
    url: "https://www.businessinsider.com/protesters-accuse-google-deepmind-breaking-promises-ai-safety-2025-6",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/Time_Magazine_logo.svg",
    logoAlt: "TIME",
    title: "60 U.K. lawmakers accuse Google of breaking AI safety pledge",
    url: "https://time.com/7313320/google-deepmind-gemini-ai-safety-pledge/",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/Fortune_magazine_logo.svg",
    logoAlt: "Fortune",
    title: "Lawmakers press Google DeepMind over delayed safety report",
    url: "https://fortune.com/2025/08/29/british-lawmakers-accuse-google-deepmind-of-breach-of-trust-over-delayed-gemini-2-5-pro-safety-report/",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/MIT_Technology_Review_Logo.png",
    logoAlt: "MIT Technology Review",
    logoWidth: 162,
    logoHeight: 80,
    title: "I checked out one of the biggest anti-AI protests yet",
    url: "https://www.technologyreview.com/2026/03/02/1133814/i-checked-out-londons-biggest-ever-anti-ai-protest/",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/Time_Magazine_logo.svg",
    logoAlt: "TIME",
    title: "A new lawsuit blames Google Gemini for a man's suicide",
    url: "https://time.com/7382406/gemini-suicide-lawsuit-death/",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/The_Independent_Logo.png",
    logoAlt: "The Independent",
    logoWidth: 547,
    logoHeight: 53,
    title: "Pro-human AI declaration gains diverse support amid calls for stronger safety measures",
    url: "https://www.independent.co.uk/tech/ai-safety-declaration-steve-bannon-b2932570.html",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/Futurism_Logo.svg",
    logoAlt: "Futurism",
    title: "The rage at OpenAI has grown so immense that there are entire protests against it",
    url: "https://futurism.com/artificial-intelligence/rage-openai-protests",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/Real_Media_Logo.png",
    logoAlt: "Real Media",
    logoWidth: 194,
    logoHeight: 259,
    title: "Pull the plug – Pause AI: A timely call for urgent regulation and treaties to control an existential threat",
    url: "https://realmedia.press/pull-the-plug",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/Politis_Logo.png",
    logoAlt: "Politis",
    logoWidth: 200,
    logoHeight: 80,
    title: "L'image : à Londres, une marche contre l'IA",
    url: "https://www.politis.fr/articles/2026/03/limage-a-londres-une-marche-contre-lia/",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/BBC_Logo_2021.svg",
    logoAlt: "BBC",
    title: "Hundreds of people march for tighter controls on AI",
    url: "https://www.youtube.com/watch?v=-0CRojvk1FE",
    linkText: "Watch video",
  },
  {
    logoHtml: '<span class="news-logo-text news-logo-text--swlondoner"><span class="sw">SW</span>Londoner</span>',
    logoAlt: "SW Londoner",
    title: "Pressing pause on AI: London activists to march in largest AI safety protest yet",
    url: "https://www.swlondoner.co.uk/news/27022026-pressing-pause-on-ai-london-activists-to-march-in-largest-ai-safety-protest-yet",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/The_Guardian_Logo.svg",
    logoAlt: "The Guardian",
    title: "UK arts must not be sacrificed for speculative AI gains, peers say",
    url: "https://www.theguardian.com/technology/2026/mar/06/uk-arts-must-not-be-sacrificed-for-speculative-ai-gains-peers-say",
    linkText: "Read story",
  },
  {
    logoSrc: "/images/media-coverage/Gizmodo_logo.svg",
    logoAlt: "Gizmodo",
    title: "The OpenAI-Anthropic Cold War Comes to Illinois",
    url: "https://gizmodo.com/the-openai-anthropic-cold-war-comes-to-illinois-2000746324",
    linkText: "Read story",
  },
];
