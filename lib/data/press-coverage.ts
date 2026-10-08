// ============================================================================
// How this list gets built and maintained
// ============================================================================
//
// DISCOVERY
// A new item usually starts as a lead — a name, an outlet, a rough date,
// or a URL someone found — not a finished, verified entry. Before it's
// added:
//
// - Prefer the outlet's own on-site search over a generic web search.
//   Several major outlets (confirmed: BBC) block automated crawlers
//   outright, and generic search's `site:` filtering is unreliable for
//   others — both return noise or false positives rather than useful
//   results.
// - Open the actual page and read it — never trust a search snippet or
//   headline alone. Snippets have produced false leads this way (e.g. a
//   promising-looking "hit" for one person turned out to be about someone
//   else entirely).
// - When a page is paywalled or JS-blocks automated fetching, retry with
//   a real logged-in browser session before giving up — it's cracked
//   pages that a plain fetch couldn't (BBC, Reuters Connect, Instagram,
//   YouTube's full descriptions, IMAGO). A hard paywall with no visible
//   text (FT) is a genuine dead end, not a "try harder" case.
// - Check images, not just body text. Several entries (Gizmodo, The
//   Guardian) have zero PauseAI mention in their article text but use a
//   genuine photo of one of our protests as the hero image, confirmed by
//   matching photographer credit against other confirmed-us photos. Text
//   search alone misses these.
//
// INCLUSION / EXCLUSION
// An item earns a place here if it has a real, verifiable connection to
// us — named in the text, or a confirmed photo of one of our protests.
// Zero connection (neither text nor photo, on inspection) means it
// doesn't belong here even if it matched on a keyword or headline theme —
// two entries (Futurism, The Observer's podcast) were removed on this
// basis. A shared name is not a connection: one outlet (The Spectator)
// was removed after realizing it cited "PauseAI.com", a different
// organization — PauseAI Global's real site is pauseai.info.
//
// THREE DISTINCT ORGS, NOT TWO — read carefully before adding anything:
//   - PauseAI UK — us. A national chapter.
//   - PauseAI Global — the international org UK is a chapter of.
//     UK and Global are related (chapter and parent); coverage of either
//     can belong here (see priority note below).
//   - "PauseAI US" — a SEPARATE, DIFFERENT organization. Despite the
//     similar name, it is not a Global chapter and not us. Coverage of
//     PauseAI US does not belong in this file, full stop — treat a "US"
//     name-match with the same suspicion as the PauseAI.com case above,
//     not as a sibling chapter to include.
//
// UK vs PauseAI Global (the legitimate pair): both are legitimate and
// both can appear, but they're not the same thing. Coverage of PauseAI
// UK's own activity, protests, or spokespeople is the priority.
// Interviews with PauseAI Global's CEO (Maxime Fournes) are kept too,
// including on UK channels (GB News, TalkTV), but are explicitly lower
// priority — flagged in comments so they're easy to reconsider or swap
// out once genuine UK spokesperson coverage on the same outlet turns up.
//
// Where a claim couldn't be verified — a date, a title, an attribution —
// it's marked with a `TODO` comment rather than guessed. Search
// `TODO` in this file to find everything still open.
//
// STRUCTURE (outlets, then articles)
// Coverage is grouped by outlet. Everything that belongs to the outlet
// rather than to one piece — display name, logo, political lean,
// carousel membership — is written once on the outlet; each of its
// `articles` carries only what's specific to that piece. To add coverage
// from an outlet already listed, append to its `articles`; add a new
// outlet entry only for a genuinely new outlet. Outlets that are distinct
// sources for our purposes stay separate even if related (e.g. each
// Reuters Connect photo agency, Wired Italia).
//
// CAROUSEL CURATION (`inCarousel`)
// The full table above (rendered on /press) includes everything that
// passes the inclusion bar, regardless of whether the outlet has a logo
// asset. The homepage marquee is a curated subset of that: only outlets
// with a strong, official, recognizable logo, and — as of the most recent
// pass — deliberately balanced across political lean rather than
// "everyone with a logo is in." Weaker or less mainstream-recognizable
// logos (regional editions, lifestyle magazines, smaller outlets) were
// cut from the carousel specifically to keep it reading as instantly
// recognizable, even though those items stay fully present in the /press
// table.
//
// `inCarousel` is set on the outlet, so an outlet can only ever hold one
// slot. Each slot links to one article: the one marked `featured: true`
// if there is one (use it to pin the most favourable piece), otherwise
// the outlet's most recent article that has a single `url`.
//
// POLITICAL LEAN (`lean`)
// Sourced from AllSides, Ad Fontes, and Media Bias/Fact Check where a
// rating exists for the outlet. Left unset — not guessed — for wire/photo
// agencies, lifestyle magazines, and small outlets with no real bias
// rating to draw on.
// ============================================================================

type Lean = "Left" | "Lean Left" | "Center" | "Lean Right" | "Right";

/** One piece of coverage. Only what's specific to the piece lives here;
    the outlet's name, logo and lean come from the parent `Outlet`. */
export type Article = {
  title: string;
  medium: "Article" | "Video" | "Photos";
  /** Single-link items set this. Multi-platform items (the same clip/story
      cross-posted) set `links` instead and leave this undefined. */
  url?: string;
  /** For a story cross-posted across platforms: one row showing each
      platform as its own link, e.g. "Instagram, X, YouTube". */
  links?: { label: string; url: string }[];
  /** Publish date, YYYY-MM-DD. Drives sort order on the /press coverage
      table; undated items sort to the bottom. */
  date?: string;
  /** Pin this article as the outlet's homepage-marquee link instead of
      the default (its most recent article with a `url`). Only meaningful
      on an outlet with `inCarousel`; at most one per outlet. */
  featured?: boolean;
};

export type Outlet = {
  name: string;
  logoSrc?: string;
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
  /** Show this outlet's logo in the homepage marquee carousel. Only set
      for outlets with a strong, recognizable, official logo asset — an
      outlet with no logoSrc/logoHtml can never appear there regardless of
      this flag. One flag per outlet, so a mark can't repeat. */
  inCarousel?: boolean;
  /** Outlet's political lean, sourced from AllSides / Ad Fontes / Media
      Bias Fact Check where a rating exists. Omitted for wire/photo
      agencies, lifestyle magazines, and small outlets with no bias
      rating — not a guess, genuinely not applicable or not ratable. */
  lean?: Lean;
  articles: Article[];
};

/** An article with its outlet's fields folded in — the flat shape the
    /press table and the homepage marquee render. */
export type CoverageItem = Article & {
  outlet: string;
  logoSrc?: string;
  logoHtml?: string;
  logoHeight?: number;
  logoIntrinsicWidth?: number;
  logoIntrinsicHeight?: number;
  lean?: Lean;
};

export const OUTLETS: Outlet[] = [
  {
    name: "Financial Times",
    logoSrc: "/images/media-coverage/Financial_Times_corporate_logo.svg",
    logoHeight: 56,
    logoIntrinsicWidth: 228,
    logoIntrinsicHeight: 311,
    inCarousel: true,
    lean: "Center",
    articles: [
      {
        title: "Peter Kyle agreed to include 'more positive language' in AI speech after Mandelson's advice",
        url: "https://www.ft.com/content/1b3e3117-b979-4187-b983-c785d230c09b",
        medium: "Article",
      },
    ],
  },
  {
    name: "Wired Italia",
    logoSrc: "/images/media-coverage/Wired_logo.svg",
    logoHeight: 35,
    logoIntrinsicWidth: 125,
    logoIntrinsicHeight: 25,
    articles: [
      {
        title: "Movements against AI are growing — inside the groups trying to stop it",
        url: "https://www.wired.it/article/movimenti-contro-intelligenza-artificiale-mappa-nomi-pauseai-stopai-controlai/",
        date: "2026-05-30",
        medium: "Article",
      },
    ],
  },
  {
    name: "Cosmopolitan Italia",
    logoSrc: "/images/media-coverage/Cosmopolitan_logo.svg",
    logoHeight: 33,
    logoIntrinsicWidth: 600,
    logoIntrinsicHeight: 106,
    articles: [
      {
        title: "Gen Z is losing faith in AI — and protest movements are growing",
        url: "https://www.cosmopolitan.com/it/lifecoach/news-attualita/a71455730/gen-z-paura-intelligenza-artificiale-ansia/",
        date: "2026-06-02",
        medium: "Article",
      },
    ],
  },
  {
    name: "Gizmodo",
    logoSrc: "/images/media-coverage/Gizmodo_logo.svg",
    logoHeight: 33,
    logoIntrinsicWidth: 186,
    logoIntrinsicHeight: 36,
    lean: "Lean Left",
    articles: [
      {
        // Article text never names PauseAI — it's about an unrelated Illinois
        // AI lobbying bill. Hero image is genuinely one of ours though: a
        // protester holding a "PAUSEAI" sign, credited Justin Tallis/AFP via
        // Getty — the same photographer credited on confirmed PauseAI UK
        // photos elsewhere in this file.
        title: "The OpenAI–Anthropic Cold War Comes to Illinois",
        url: "https://gizmodo.com/the-openai-anthropic-cold-war-comes-to-illinois-2000746324",
        date: "2026-04-14",
        medium: "Article",
      },
    ],
  },
  {
    name: "Wall Street Journal",
    logoSrc: "/images/media-coverage/wall-street-journal-logo.png",
    logoHeight: 26,
    logoIntrinsicWidth: 777,
    logoIntrinsicHeight: 67,
    inCarousel: true,
    lean: "Center",
    articles: [
      {
        title: "AI Giants Go on Charm Offensive to Avert Public Backlash",
        url: "https://www.wsj.com/tech/ai/ai-companies-public-relations-ae312d79",
        date: "2026-04-07",
        medium: "Article",
      },
    ],
  },
  {
    name: "Business Insider",
    logoSrc: "/images/media-coverage/Business_Insider_Logo.svg",
    logoHeight: 43,
    logoIntrinsicWidth: 103,
    logoIntrinsicHeight: 32,
    inCarousel: true,
    lean: "Lean Left",
    articles: [
      {
        title: "Protesters accuse Google DeepMind of breaking AI safety promises",
        url: "https://www.businessinsider.com/protesters-accuse-google-deepmind-breaking-promises-ai-safety-2025-6",
        date: "2025-06-30",
        medium: "Article",
      },
    ],
  },
  {
    name: "TIME",
    logoSrc: "/images/media-coverage/Time_Magazine_logo.svg",
    logoHeight: 42,
    logoIntrinsicWidth: 298,
    logoIntrinsicHeight: 92,
    inCarousel: true,
    lean: "Lean Left",
    articles: [
      {
        title: "60 U.K. lawmakers accuse Google of breaking AI safety pledge",
        url: "https://time.com/7313320/google-deepmind-gemini-ai-safety-pledge/",
        date: "2025-08-29",
        medium: "Article",
      },
    ],
  },
  {
    name: "Fortune",
    logoSrc: "/images/media-coverage/Fortune_magazine_logo.svg",
    logoHeight: 37,
    logoIntrinsicWidth: 90,
    logoIntrinsicHeight: 21,
    inCarousel: true,
    lean: "Center",
    articles: [
      {
        title: "Lawmakers press Google DeepMind over delayed safety report",
        url: "https://fortune.com/2025/08/29/british-lawmakers-accuse-google-deepmind-of-breach-of-trust-over-delayed-gemini-2-5-pro-safety-report/",
        date: "2025-08-29",
        medium: "Article",
      },
    ],
  },
  {
    name: "MIT Technology Review",
    logoSrc: "/images/media-coverage/MIT_Technology_Review_modern_logo.svg",
    logoHeight: 54,
    logoIntrinsicWidth: 184,
    logoIntrinsicHeight: 92,
    inCarousel: true,
    lean: "Center",
    articles: [
      {
        title: "I checked out one of the biggest anti-AI protests yet",
        url: "https://www.technologyreview.com/2026/03/02/1133814/i-checked-out-londons-biggest-ever-anti-ai-protest/",
        date: "2026-03-02",
        medium: "Article",
      },
    ],
  },
  {
    name: "The Guardian",
    logoSrc: "/images/media-coverage/The_Guardian_Logo.svg",
    logoHeight: 44,
    logoIntrinsicWidth: 295,
    logoIntrinsicHeight: 97,
    inCarousel: true,
    lean: "Left",
    articles: [
      {
        // Article text never names PauseAI — it's about a House of Lords
        // copyright report. Hero image is genuinely one of ours: protesters
        // holding "Pull The Plug" and "It's not too late... to regulate"
        // signs from the same march covered elsewhere in this file.
        title: "UK arts must not be sacrificed for speculative AI gains, peers say",
        url: "https://www.theguardian.com/technology/2026/mar/06/uk-arts-must-not-be-sacrificed-for-speculative-ai-gains-peers-say",
        date: "2026-03-06",
        medium: "Article",
      },
      {
        // Body text never names PauseAI; hero image caption does ("Protesters
        // from Pause AI block the entrance to Downing Street on Wednesday",
        // photo: Ian Davidson/SOPA Images), from the 16 Sep protest.
        title: "'A critical moment': concern UK is not up to speed in acting on AI risks",
        url: "https://www.theguardian.com/technology/2026/sep/18/a-critical-moment-concern-uk-is-not-up-to-speed-in-acting-on-ai-risks",
        date: "2026-09-18",
        medium: "Article",
      },
      {
        // theguardian.com blocks our fetch tooling outright, so this links
        // the AOL syndication copy instead — same Robert Booth byline, same
        // text. Quotes Joseph Miller at length, described as having
        // suspended his Oxford doctorate "to run Pause AI's UK branch", plus
        // PauseAI Global CEO Maxime Fournes. Covers the post-16-Sep surge in
        // sign-ups and direct-action sentiment.
        title: "'Pull the plug': protesters resort to direct action against AI firms",
        url: "https://aol.co.uk/articles/pull-plug-protesters-resort-direct-060004000.html",
        date: "2026-10-06",
        medium: "Article",
      },
    ],
  },
  {
    name: "BBC",
    logoSrc: "/images/media-coverage/BBC_Logo_2021.svg",
    logoHeight: 40,
    logoIntrinsicWidth: 560,
    logoIntrinsicHeight: 160,
    inCarousel: true,
    lean: "Center",
    articles: [
      {
        title: "Hundreds of people march for tighter controls on AI",
        // This URL is a third-party reupload/compilation channel ("Mark
        // 1333"), not BBC's own channel — searched BBC's own site and
        // YouTube's official BBC News channel and couldn't find the original
        // source. Content looks like a genuine BBC London bulletin segment
        // (28 Feb 2026), just not a verifiable BBC source link. Swap this for
        // the real BBC link if it turns up.
        url: "https://youtu.be/-0CRojvk1FE?t=146",
        date: "2026-02-28",
        medium: "Video",
      },
      {
        title: "Why some experts increasingly fear AI will take over",
        url: "https://www.bbc.co.uk/news/articles/c74edv9887eo",
        date: "2026-09-10",
        medium: "Article",
      },
      {
        title: "Why are there concerns AI could threaten humanity?",
        url: "https://www.bbc.co.uk/news/articles/c790xvnzgnno",
        date: "2026-09-14",
        medium: "Article",
      },
    ],
  },
  {
    name: "The Observer",
    logoSrc: "/images/media-coverage/the-observer-logo.svg",
    logoHeight: 30,
    logoIntrinsicWidth: 980,
    logoIntrinsicHeight: 157,
    articles: [
      {
        // TODO verify: written episode description has no PauseAI mention,
        // but this is a 33-min interview — audio may name us and there's no
        // transcript to check. Confirm by listening before treating as
        // confirmed UK coverage.
        title: "Endgame: Can we live with Artificial General Intelligence? - The People vs AI",
        url: "https://open.spotify.com/episode/3jPBSckJzWIq6Y2agpVSKH",
        date: "2026-06-10",
        medium: "Article",
      },
    ],
  },
  {
    name: "The Independent",
    logoSrc: "/images/media-coverage/The_Independent_Logo.png",
    logoHeight: 26,
    logoIntrinsicWidth: 540,
    logoIntrinsicHeight: 38,
    inCarousel: true,
    lean: "Lean Left",
    articles: [
      {
        title: "Pro-human AI declaration gains diverse support amid calls for stronger safety measures",
        url: "https://www.independent.co.uk/tech/ai-safety-declaration-steve-bannon-b2932570.html",
        date: "2026-03-05",
        medium: "Article",
      },
    ],
  },
  {
    name: "Futurism",
    logoSrc: "/images/media-coverage/Futurism_Logo.svg",
    logoHeight: 33,
    logoIntrinsicWidth: 489,
    logoIntrinsicHeight: 93,
    articles: [
      {
        // Article text doesn't name PauseAI by name (covers the SF "QuitGPT"
        // protest plus a vague "London" mention), but the hero photo is
        // confirmed to be one of our own UK protests.
        title: "The rage at OpenAI has grown so immense that there are entire protests against it",
        url: "https://futurism.com/artificial-intelligence/rage-openai-protests",
        date: "2026-03-05",
        medium: "Article",
      },
    ],
  },
  {
    name: "Real Media",
    logoSrc: "/images/media-coverage/Real_Media_Logo.png",
    logoHeight: 52,
    logoIntrinsicWidth: 94,
    logoIntrinsicHeight: 83,
    articles: [
      {
        title: "Pull the plug — Pause AI: a timely call for urgent regulation",
        url: "https://realmedia.press/pull-the-plug",
        date: "2026-03-06",
        medium: "Article",
      },
    ],
  },
  {
    name: "SW Londoner",
    logoHtml: '<span class="news-logo-text news-logo-text--swlondoner"><span class="sw">SW</span>Londoner</span>',
    articles: [
      {
        title: "Pressing pause on AI: London activists to march in largest AI safety protest yet",
        url: "https://www.swlondoner.co.uk/news/27022026-pressing-pause-on-ai-london-activists-to-march-in-largest-ai-safety-protest-yet",
        date: "2026-02-27",
        medium: "Article",
      },
    ],
  },
  {
    name: "Politis",
    logoSrc: "/images/media-coverage/Politis_Logo.png",
    logoHeight: 43,
    logoIntrinsicWidth: 180,
    logoIntrinsicHeight: 58,
    lean: "Left",
    articles: [
      {
        title: "L'image : à Londres, une marche contre l'IA",
        url: "https://www.politis.fr/articles/2026/03/limage-a-londres-une-marche-contre-lia/",
        date: "2026-03-03",
        medium: "Article",
      },
    ],
  },
  {
    name: "Daily Mail",
    logoSrc: "/images/media-coverage/Daily_Mail_masthead.svg",
    logoHeight: 31,
    logoIntrinsicWidth: 1000,
    logoIntrinsicHeight: 158,
    inCarousel: true,
    lean: "Right",
    articles: [
      {
        title: "When given a choice, AI opts for self-preservation over human life — and that should terrify us all",
        url: "https://www.dailymail.com/debate/article-16032063/AI-opts-self-preservation-human-life.html",
        date: "2026-08-05",
        medium: "Article",
      },
    ],
  },
  {
    name: "New Statesman",
    logoSrc: "/images/media-coverage/New_Statesman_magazine_logo.svg",
    logoHeight: 30,
    logoIntrinsicWidth: 524,
    logoIntrinsicHeight: 80,
    lean: "Left",
    articles: [
      {
        title: "The anti-AI revolt is here",
        url: "https://www.newstatesman.com/politics/society/2026/08/the-anti-ai-revolt-is-here",
        date: "2026-08-19",
        medium: "Article",
      },
    ],
  },
  {
    name: "Channel 4",
    logoSrc: "/images/media-coverage/Channel_4_logo.svg",
    logoHeight: 56,
    logoIntrinsicWidth: 178,
    logoIntrinsicHeight: 240,
    inCarousel: true,
    lean: "Center",
    articles: [
      {
        title: "Hundreds of protesters rally against AI outside Downing Street",
        url: "https://www.channel4.com/news/hundreds-of-protesters-rally-against-ai-outside-downing-street",
        date: "2026-09-16",
        medium: "Article",
        // Direct protest coverage — preferred over the newer explainer video.
        featured: true,
      },
      {
        title: "The danger of AI and the global race to control it - explained",
        url: "https://www.youtube.com/watch?v=rDb5qlSAmvQ&t=249s",
        date: "2026-09-17",
        medium: "Video",
      },
      {
        medium: "Video",
        title: "PauseAI activists stage emergency protest outside Downing Street",
        links: [
          { label: "Facebook", url: "https://www.facebook.com/reel/1522309576272007/" },
          { label: "X", url: "https://x.com/Channel4News/status/2100298598772605015" },
          { label: "YouTube", url: "https://www.youtube.com/shorts/2JRtI-dDwgc" },
        ],
        date: "2026-09-16",
      },
    ],
  },
  {
    name: "ITV",
    logoSrc: "/images/media-coverage/ITV_logo.svg",
    logoHeight: 46,
    logoIntrinsicWidth: 1000,
    logoIntrinsicHeight: 368,
    inCarousel: true,
    lean: "Center",
    articles: [
      {
        title: "Science Correspondent breaks down the 'terrifying' risks of superintelligent AI",
        url: "https://www.youtube.com/watch?v=cvMRaa6h8tM&t=486s",
        date: "2026-09-16",
        medium: "Video",
        featured: true,
      },
      {
        medium: "Video",
        title: "Protesters demand pause on AI development",
        links: [
          { label: "Instagram", url: "https://www.instagram.com/p/DdWzB4Gxkv_/" },
          { label: "YouTube", url: "https://www.youtube.com/shorts/TFxdevKHM8s" },
        ],
        date: "2026-09-16",
      },
      {
        medium: "Video",
        title: "Why is AI safety back in the spotlight",
        url: "https://www.youtube.com/shorts/rkgvZRnoytA",
        date: "2026-09-16",
      },
    ],
  },
  {
    name: "Al Arabiya",
    lean: "Lean Right",
    articles: [
      {
        medium: "Video",
        title: "Activists gather outside Downing Street in London, calling on governments to pause AI development",
        url: "https://www.instagram.com/p/DdWvDuejvh7/",
        date: "2026-09-16",
      },
    ],
  },
  {
    name: "Imago Images",
    articles: [
      {
        medium: "Photos",
        title: "Pause AI, urging the government to limit the development of artificial intelligence amid warnings that it could lead to human extinction",
        url: "https://www.imago-images.com/st/0867004406",
        date: "2026-09-16",
      },
    ],
  },
  {
    name: "Reuters Connect (Anadolu Agency)",
    articles: [
      {
        medium: "Photos",
        title: "PauseAI activists stage emergency protest outside Downing Street in London",
        url: "https://www.reutersconnect.com/item/pauseai-activists-stage-emergency-protest-outside-downing-street-in-london/dGFnOnJldXRlcnMuY29tLDIwMjY6bmV3c21sX01UMUFOQURMMDAwTkZPN1hH",
        date: "2026-09-16",
      },
    ],
  },
  {
    name: "Reuters Connect (Zuma Press)",
    articles: [
      {
        medium: "Photos",
        title: "Pause AI Protest Outside Downing Street",
        url: "https://www.reutersconnect.com/item/pause-ai-protest-outside-downing-street/dGFnOnJldXRlcnMuY29tLDIwMjY6bmV3c21sX01UMVpVTUEwMDBGRzlOVEs",
        date: "2026-09-16",
      },
    ],
  },
  {
    name: "Reuters Connect (Nurphoto)",
    articles: [
      {
        medium: "Photos",
        title: "Pause AI Emergency Protest In London",
        url: "https://www.reutersconnect.com/item/pause-ai-emergency-protest-in-london/dGFnOnJldXRlcnMuY29tLDIwMjY6bmV3c21sX01UMU5VUlBITzAwMDhGQTJTVg",
        date: "2026-09-16",
      },
    ],
  },
  {
    name: "Boston Globe",
    lean: "Lean Left",
    articles: [
      {
        medium: "Photos",
        title: "AI rivals found rare agreement on safety. Putting it into practice is harder.",
        url: "https://www.bostonglobe.com/2026/09/16/business/ai-slowdown-safety/",
        date: "2026-09-16",
      },
      {
        // Body text never names us; the photo caption does ("A protest by
        // civic action group PauseAI UK in London on Sept 16..."), from the
        // Downing Street protest.
        // TODO verify date: the URL path reads /2026/09/20/ but the byline
        // on the page reads September 21.
        medium: "Photos",
        title: "As Trump weighs in, AI leaders debate how to slow down without crippling the economy",
        url: "https://www.bostonglobe.com/2026/09/20/business/ai-threat-slowdown-pause-economy/",
        date: "2026-09-21",
      },
    ],
  },
  {
    name: "Vox",
    logoSrc: "/images/media-coverage/Vox_logo.svg",
    logoHeight: 52,
    logoIntrinsicWidth: 120,
    logoIntrinsicHeight: 58,
    inCarousel: true,
    lean: "Left",
    articles: [
      {
        medium: "Photos",
        title: "Should we be skeptical about the AI panic?",
        url: "https://www.vox.com/podcasts/502875/ai-existential-risk-jacob-coxon-anthropic-dario-amodei",
        date: "2026-09-16",
      },
    ],
  },
  {
    name: "Manchester Evening News",
    lean: "Lean Left",
    articles: [
      {
        medium: "Photos",
        title: "King Charles to issue 'deeply concerning' message to AI leaders after doomsday warnings",
        url: "https://www.manchestereveningnews.co.uk/news/uk-news/king-charles-issue-deeply-concerning-34629383",
        date: "2026-09-17",
      },
    ],
  },
  {
    name: "Daily Sabah",
    lean: "Right",
    articles: [
      {
        medium: "Photos",
        title: "From hallucinations to wiping out humanity: How AI's path advanced",
        url: "https://www.dailysabah.com/business/tech/from-hallucinations-to-wiping-out-humanity-how-ai-path-advanced",
        date: "2026-09-17",
      },
    ],
  },
  {
    name: "International Business Times",
    logoHtml: '<span class="news-logo-text news-logo-text--ibtimes">International Business Times<span class="uk">UK</span></span>',
    lean: "Center",
    articles: [
      {
        medium: "Article",
        title: "'10% Chance of Extinction': AI Protesters Take Scientists' Warning to Downing Street",
        url: "https://www.ibtimes.co.uk/london-protesters-demand-tougher-advanced-ai-controls-1820296",
        date: "2026-09-17",
      },
    ],
  },
  {
    name: "GB News",
    logoSrc: "/images/media-coverage/GB_News_logo.png",
    logoHeight: 28,
    logoIntrinsicWidth: 1240,
    logoIntrinsicHeight: 164,
    inCarousel: true,
    lean: "Right",
    articles: [
      {
        medium: "Video",
        // PauseAI Global CEO Maxime Fournes (not PauseAI UK specifically),
        // debating Maxwell Marlow of the Adam Smith Institute.
        title: "Should we shut down AI? GB News debate",
        url: "https://www.youtube.com/watch?v=kTc_Q72q7hY",
        date: "2026-07-24",
      },
    ],
  },
  {
    name: "TalkTV",
    logoSrc: "/images/media-coverage/TalkTV_logo.png",
    logoHeight: 52,
    logoIntrinsicWidth: 873,
    logoIntrinsicHeight: 778,
    inCarousel: true,
    lean: "Right",
    articles: [
      {
        medium: "Video",
        // PauseAI Global CEO Maxime Fournes (not PauseAI UK specifically),
        // interviewed by Ian Collins.
        title: "\"It Could Be Human Extinction\" | AI Expert Warns Of Internet Catastrophe In SIX MONTHS",
        url: "https://www.youtube.com/watch?v=CuwQkwhhfdM",
        date: "2026-09-14",
      },
    ],
  },
  {
    name: "Islington Tribune",
    articles: [
      {
        medium: "Article",
        title: "Watch out! The robots are coming",
        url: "https://www.islingtontribune.co.uk/article/watch-out-the-robots-are-coming",
        date: "2023-05-26",
      },
      {
        // Quotes Joseph Miller as director of PauseAI UK ahead of the June
        // 2025 DeepMind protest.
        medium: "Article",
        title: "Tech firms urged to put the brakes on AI",
        url: "https://www.islingtontribune.co.uk/article/tech-firms-urged-to-put-the-brakes-on-ai",
        date: "2025-06-27",
      },
      {
        // Names the "Pause AI" movement and quotes Kabir Kumar, identified
        // as "a PauseAI protester", at the Bletchley Park AI Safety Summit
        // demonstration.
        medium: "Article",
        title: "What happens in Bletchley, stays in\u2026",
        url: "https://www.islingtontribune.co.uk/article/what-happens-in-bletchley-stays-in",
        date: "2023-11-03",
      },
      {
        // Covers a Pause AI mock trial outside Google DeepMind's King's Cross
        // office. Quotes communications lead Tom Bibby ("if anyone builds
        // it, everyone is going to die") and organiser Ella Hughes; mentions
        // Joseph Miller without labelling him Pause AI.
        medium: "Article",
        title: "Stark warning from protesters calling for AI pause: It's going to turn out bad",
        url: "https://www.islingtontribune.co.uk/article/stark-warning-from-protesters-calling-for-ai-pause-its-going-to-turn-out-bad",
        date: "2025-07-04",
      },
    ],
  },
  {
    // Same publisher as the Islington Tribune, but a separate local title,
    // so it gets its own entry rather than joining theirs.
    name: "Westminster Extra",
    articles: [
      {
        // Quotes Joseph Miller on the Parliament Square protest held during
        // the Paris AI summit week.
        medium: "Article",
        title: "Warning\u2026 \u2018governments are racing ahead\u2019 with AI",
        url: "https://www.westminsterextra.co.uk/article/warning-governments-are-racing-ahead-with-ai",
        date: "2025-02-14",
      },
      {
        // Quotes Alistair Stewart, named as "one of the founders of Pause AI
        // in this country", ahead of the Bletchley Park summit.
        medium: "Article",
        title: "New Pause AI demand for moratorium",
        url: "https://www.westminsterextra.co.uk/article/new-pause-ai-demand-for-moratorium",
        date: "2023-10-20",
      },
      {
        // Calls the group "Pause AI UK" and quotes director Joseph Miller at
        // length ("We are just asking not to develop the next generation of
        // AI"), tying growth in sign-ups to the 16 Sep Downing Street protest.
        medium: "Article",
        title: "Extinction fear boost for Pause AI",
        url: "https://www.westminsterextra.co.uk/article/extinction-fear-boost-for-pause-ai",
        date: "2026-09-18",
      },
    ],
  },
  {
    // Sinclair's national desk; the piece runs on its member stations, and
    // krcrtv.com is the copy we found it on.
    name: "The National News Desk (KRCR)",
    articles: [
      {
        // Body text never names us; the photo caption does, identifying
        // PauseAI activists with placards near Downing Street on 16 Sep.
        medium: "Article",
        title: "AI concerns beginning to mirror Y2K-era as push for regulation continues",
        url: "https://krcrtv.com/news/nation-world/ai-concerns-beginning-to-mirror-y2k-era-as-push-for-regulation-continues",
        date: "2026-09-18",
      },
    ],
  },
  {
    name: "The Japan Times",
    articles: [
      {
        // Body text is Dambisa Moyo's syndicated Project Syndicate column —
        // no PauseAI mention. Hero image caption does: "Demonstrators take
        // part in a civic protest organized by the group PauseAI UK outside
        // Downing Street in central London on Sept. 16." Credit: AFP-JIJI.
        medium: "Article",
        title: "Hedging the AI doomsday risk",
        url: "https://www.japantimes.co.jp/commentary/2026/10/07/world/ai-doomsday-risk/",
        date: "2026-10-07",
      },
    ],
  },
];

/** Every way `OUTLETS` can be malformed in a way that would break a page or
    silently mislead (e.g. a carousel slot with no logo or nothing to link
    to). Empty when the data is sound. Pure so tests can feed it bad data. */
export function findOutletProblems(outlets: Outlet[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const outlet of outlets) {
    const at = outlet.name || "(unnamed outlet)";
    if (!outlet.name.trim()) problems.push(`${at}: name is empty`);
    if (seen.has(outlet.name)) problems.push(`${at}: duplicate outlet name`);
    seen.add(outlet.name);

    if (outlet.articles.length === 0) problems.push(`${at}: has no articles`);

    outlet.articles.forEach((article, i) => {
      const where = `${at} article ${i + 1} ("${article.title}")`;
      if (!article.title.trim()) problems.push(`${where}: title is empty`);
      if (!article.url && !article.links?.length) problems.push(`${where}: needs a url or links`);
      if (article.url && article.links) problems.push(`${where}: has both url and links — use one`);
      if (article.date && !/^\d{4}-\d{2}-\d{2}$/.test(article.date)) {
        problems.push(`${where}: date "${article.date}" is not YYYY-MM-DD`);
      }
      if (article.featured && !article.url) problems.push(`${where}: featured needs a single url`);
      if (article.featured && !outlet.inCarousel) problems.push(`${where}: featured only applies to inCarousel outlets`);
    });

    if (outlet.articles.filter((a) => a.featured).length > 1) {
      problems.push(`${at}: more than one featured article`);
    }

    if (outlet.logoSrc && outlet.logoHtml) problems.push(`${at}: has both logoSrc and logoHtml — use one`);
    if (outlet.logoSrc && (!outlet.logoIntrinsicWidth || !outlet.logoIntrinsicHeight)) {
      problems.push(`${at}: logoSrc needs logoIntrinsicWidth and logoIntrinsicHeight`);
    }

    if (outlet.inCarousel) {
      if (!outlet.logoSrc && !outlet.logoHtml) problems.push(`${at}: inCarousel but has no logo`);
      if (outlet.logoSrc && !outlet.logoHeight) problems.push(`${at}: inCarousel logoSrc needs logoHeight`);
      if (!outlet.articles.some((a) => a.url)) problems.push(`${at}: inCarousel but no article with a single url to link to`);
    }
  }

  return problems;
}

const problems = findOutletProblems(OUTLETS);
if (problems.length > 0) {
  throw new Error(`Invalid press coverage data in lib/data/press-coverage.ts:\n- ${problems.join("\n- ")}`);
}

// Fold an outlet's shared fields into each of its articles, giving the
// flat `CoverageItem` shape the pages render. `inCarousel` and `articles`
// are outlet-only and don't carry onto the items.
function flattenOutlet(outlet: Outlet): CoverageItem[] {
  const { name, logoSrc, logoHtml, logoHeight, logoIntrinsicWidth, logoIntrinsicHeight, lean } = outlet;
  return outlet.articles.map((article) => ({
    outlet: name,
    logoSrc,
    logoHtml,
    logoHeight,
    logoIntrinsicWidth,
    logoIntrinsicHeight,
    lean,
    ...article,
  }));
}

// Full, dated table for the /press page — newest first, undated items
// (most social/wire links are blocked to automated date lookups) sorted
// to the bottom in their original list order.
export const allCoverage: CoverageItem[] = OUTLETS.flatMap(flattenOutlet).sort((a, b) => {
  if (a.date && b.date) return b.date.localeCompare(a.date);
  if (a.date) return -1;
  if (b.date) return 1;
  return 0;
});

// The article an outlet's marquee slot links to: the one pinned with
// `featured`, else the most recent with a single `url` (multi-platform
// `links` items have no one URL to point at). Undated articles rank last.
function marqueeItem(outlet: Outlet): CoverageItem {
  const linkable = flattenOutlet(outlet).filter((item) => item.url);
  const pinned = linkable.find((item) => item.featured);
  if (pinned) return pinned;
  return [...linkable].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
}

// The homepage marquee's curated subset — only outlets with a strong,
// recognizable logo (`inCarousel: true`), one slot per outlet. Desktop:
// 2 rows. Mobile (handled in page.tsx): 3 rows so each row is shorter and
// easier to scan on a narrow viewport.
const CAROUSEL_ITEMS = OUTLETS.filter((outlet) => outlet.inCarousel).map(marqueeItem);
const desktopSplit = Math.ceil(CAROUSEL_ITEMS.length / 2);
const mobileSplit = Math.ceil(CAROUSEL_ITEMS.length / 3);

// The marquee loops by rendering each row's item list twice side by side
// and scrolling by exactly -50% — seamless only if one copy is already
// wider than the viewport. With a curated (short) item list, a half- or
// third-sized row can be too narrow on wide screens, leaving a gap
// instead of looping. Repeat a short row's items until the count is
// safely above what any realistic screen width needs, rather than
// shrinking the curation to fit.
function tileToMinLength<T>(items: T[], minLength: number): T[] {
  if (items.length === 0) return items;
  const tiled: T[] = [];
  while (tiled.length < minLength) tiled.push(...items);
  return tiled;
}

export const newsRow1 = tileToMinLength(CAROUSEL_ITEMS.slice(0, desktopSplit), 14);
export const newsRow2 = tileToMinLength(CAROUSEL_ITEMS.slice(desktopSplit), 14);

export const newsMobileRow1 = tileToMinLength(CAROUSEL_ITEMS.slice(0, mobileSplit), 10);
export const newsMobileRow2 = tileToMinLength(CAROUSEL_ITEMS.slice(mobileSplit, mobileSplit * 2), 10);
export const newsMobileRow3 = tileToMinLength(CAROUSEL_ITEMS.slice(mobileSplit * 2), 10);
