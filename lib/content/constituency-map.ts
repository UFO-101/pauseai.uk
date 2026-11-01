// Every word of the constituency map (/campaigns/constituencies).
import type { MapLayer } from "@/lib/constituency-map";

/** Something to do, under the map, and its link: to follow, or, with `share`, to copy. */
type NextStep = { title: string; body: string; link: { label: string; href: string; share?: boolean } };

/** What a layer's counts are of, in a phrase that follows a number: "3 supporters". */
const counted = (n: number, one: string, many: string) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

export const constituencyMapCopy = {
  title: "The Road to 650",
  description: "Where PauseAI supporters are, and which MPs have heard from them, constituency by constituency.",
  lede: "Help us make sure every MP is briefed by their own constituents about the risk of out of control superintelligent AI.",

  /** The switch between layers, and each layer's name on it. */
  layerLabel: "Show",
  layers: {
    supporters: "Supporters",
    letters: "Letters",
  } satisfies Record<MapLayer, string>,

  /** The line over the map saying how many constituencies a layer reaches. */
  reach: (places: number) => `So far: ${places} / 650 constituencies`,

  /** The key under the map. */
  legendLabel: {
    supporters: "Supporters in the constituency",
    letters: "Letters sent to the MP",
  } satisfies Record<MapLayer, string>,
  none: "None yet",

  /** What the map is, read out in place of drawing it. */
  mapLabel: (layer: string) => `Map of the UK's 650 constituencies, coloured by ${layer}.`,

  /** Beside the map, first: what to do. */
  write: {
    title: "Write to your MP",
    body: "It takes two minutes. One letter turns your constituency on the map from empty to coloured, and puts AI risk on your MP's desk.",
  },

  finder: {
    label: "Your postcode",
    placeholder: "Postcode",
    button: "Find",
    finding: "Finding…",
    notOnMap: "We found your MP, but their constituency isn't on this map.",
    failed: "Something went wrong. Try again in a moment.",
  },

  card: {
    yours: "Your constituency",
    mp: (name: string, party: string) => `MP: ${name} (${party})`,
    noMp: "No MP in office",
    supporters: (n: number) => counted(n, "supporter", "supporters"),
    letters: (n: number) => counted(n, "letter", "letters"),
    frontier: (n: number) => `${counted(n, "letter", "letters")} about regulating AI developers`,
    sobel: (n: number) => `${counted(n, "letter", "letters")} about the Superintelligence Bill`,
    close: "Clear",
  },

  /** What a person can do about the constituency they picked: the bill's letter first, as it's sooner. */
  actions: {
    frontier: { label: "Ask your MP to regulate AI developers", href: "/campaigns/regulate-letter-pm" },
    sobel: {
      label: "Ask your MP to back the Superintelligence Bill",
      href: "/campaigns/support-sobel-bill",
    },
    events: { label: "Find people near you", href: "/events" },
  },

  /** This page's path, for the link to share. */
  path: "/campaigns/constituencies",

  next: {
    title: "How to fill it in",
    steps: <NextStep[]>[
      {
        title: "Ask someone in an empty constituency",
        body: "Know someone in a seat with no supporters yet? Send them this map. Their letter will be the first that MP has had from us.",
        link: { label: "Copy the link to this map", href: "/campaigns/constituencies", share: true },
      },
      {
        title: "Meet people near you",
        body: "Local groups write letters together, visit MPs' surgeries and hold events.",
        link: { label: "See events", href: "/events" },
      },
    ],
  },

  table: {
    title: "Top 10 letter writing constituencies",
    total: (n: number) => `${counted(n, "letter", "letters")} sent`,
    constituency: "Constituency",
    mp: "MP",
    letters: "Letters",
  },

  source:
    "Supporters are counted by the postcode they gave us; letters by the MP they went to. Hexagon layout by Open Innovations.",
  sourceLink: "https://github.com/odileeds/hexmaps",
};
