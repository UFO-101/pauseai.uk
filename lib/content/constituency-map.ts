// Every word of the constituency map (/campaigns/constituencies).
import type { MapLayer } from "@/lib/constituency-map";

/** Something to do, under the map, and its link: to follow, or, with `share`, to copy. */
type NextStep = { title: string; body: string; link: { label: string; href: string; share?: boolean } };

/** What a layer's counts are of, in a phrase that follows a number: "3 supporters". */
const counted = (n: number, one: string, many: string) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

export const constituencyMapCopy = {
  title: "⁂ Fill the map",
  description: "⁂ Where PauseAI supporters are, and which MPs have heard from them, constituency by constituency.",
  lede: "⁂ Every MP counts the same in a vote, so every constituency is one hexagon. An empty one is an MP who hasn't heard from anyone about AI risk yet.",

  /** The switch between layers, and each layer's name on it. */
  layerLabel: "⁂ Show",
  layers: {
    supporters: "Supporters",
    frontier: "Regulate AI developers",
    sobel: "Letters: Superintelligence Bill",
  } satisfies Record<MapLayer, string>,

  /** The sentence over the map saying how far a layer reaches. */
  reach: {
    supporters: (places: number, total: number) =>
      `⁂ ${counted(total, "supporter", "supporters")} in ${places} of 650 constituencies.`,
    frontier: (places: number, total: number) =>
      `⁂ ${counted(total, "letter", "letters")} about frontier AI, to ${places} of 650 MPs.`,
    sobel: (places: number, total: number) =>
      `⁂ ${counted(total, "letter", "letters")} about the Superintelligence Bill, to ${places} of 650 MPs.`,
  } satisfies Record<MapLayer, (places: number, total: number) => string>,

  /** The key under the map. */
  legendLabel: {
    supporters: "⁂ Supporters in the constituency",
    frontier: "⁂ Letters sent to the MP",
    sobel: "⁂ Letters sent to the MP",
  } satisfies Record<MapLayer, string>,
  none: "⁂ None yet",

  /** What the map is, read out in place of drawing it. */
  mapLabel: (layer: string) =>
    `⁂ Map of the UK's 650 constituencies, coloured by ${layer}. The table below has every number.`,

  finder: {
    label: "Your postcode",
    button: "⁂ Find",
    finding: "⁂ Finding…",
    notOnMap: "⁂ We found your MP, but their constituency isn't on this map.",
    failed: "⁂ Something went wrong. Try again in a moment.",
  },

  card: {
    prompt: "⁂ Pick a constituency on the map, or find yours by postcode.",
    yours: "⁂ Your constituency",
    mp: (name: string, party: string) => `⁂ MP: ${name} (${party})`,
    noMp: "⁂ No MP in office",
    supporters: (n: number) => counted(n, "supporter", "supporters"),
    frontier: (n: number) => `⁂ ${counted(n, "letter", "letters")} about frontier AI`,
    sobel: (n: number) => `⁂ ${counted(n, "letter", "letters")} about the Superintelligence Bill`,
    close: "⁂ Clear",
  },

  /** What a person can do about the constituency they picked: the first is the one the map is showing. */
  actions: {
    frontier: { label: "⁂ Email your MP about frontier AI", href: "/campaigns/regulate-letter-pm" },
    sobel: {
      label: "⁂ Ask your MP to back the Superintelligence Bill",
      href: "/campaigns/support-sobel-bill",
    },
    events: { label: "⁂ Find people near you", href: "/events" },
  },

  /** This page's path, for the link to share. */
  path: "/campaigns/constituencies",

  next: {
    title: "⁂ How to fill it in",
    steps: <NextStep[]>[
      {
        title: "⁂ Write to your MP",
        body: "⁂ It takes two minutes. One letter turns your constituency on the map from empty to coloured, and puts AI risk on your MP's desk.",
        link: { label: "⁂ Email your MP", href: "/campaigns/support-sobel-bill" },
      },
      {
        title: "⁂ Ask someone in an empty constituency",
        body: "⁂ Know someone in a seat with no supporters yet? Send them this map. Their letter will be the first that MP has had from us.",
        link: { label: "⁂ Copy the link to this map", href: "/campaigns/constituencies", share: true },
      },
      {
        title: "⁂ Meet people near you",
        body: "⁂ Local groups write letters together, visit MPs' surgeries and hold events.",
        link: { label: "⁂ See events", href: "/events" },
      },
    ],
  },

  table: {
    summary: "⁂ Every constituency as a table",
    caption: "⁂ Supporters and letters in each constituency",
    constituency: "⁂ Constituency",
    mp: "⁂ MP",
    supporters: "Supporters",
    frontier: "⁂ Frontier AI letters",
    sobel: "⁂ Bill letters",
  },

  source:
    "⁂ Supporters are counted by the postcode they gave us; letters by the MP they went to. Hexagon layout by Open Innovations.",
  sourceLink: "https://github.com/odileeds/hexmaps",
};
