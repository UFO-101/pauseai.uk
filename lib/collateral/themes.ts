export type ThemeId = "orange" | "cream" | "black";

export interface Theme {
  id: ThemeId;
  label: string;
  bg: string;
  text: string;
  /** Secondary text, e.g. blurbs and footers. */
  muted: string;
  /** Fill colour for the CTA pill and rules. */
  accent: string;
  /** Text colour to use on top of `accent`. */
  onAccent: string;
  /** Accent colour that is safe to use as text on `bg`. */
  accentText: string;
  /** Path of the logo variant that reads well on `bg`. */
  logoSrc: string;
}

// The logo and QR mark use #FF9416. The site UI uses #e57226 for accents.
export const BRAND_ORANGE = "#FF9416";
export const SITE_ORANGE = "#e57226";
export const INK = "#1A1612";
export const CREAM = "#FDF8F3";

const LOGO_DIR = "/images/logos/collateral";

export const THEMES: Theme[] = [
  {
    id: "orange",
    label: "Orange",
    bg: BRAND_ORANGE,
    text: INK,
    muted: "#3A2A18",
    accent: INK,
    onAccent: CREAM,
    accentText: INK,
    logoSrc: `${LOGO_DIR}/logo-mono-black.svg`,
  },
  {
    id: "cream",
    label: "Cream",
    bg: CREAM,
    text: INK,
    muted: "#5C544A",
    accent: SITE_ORANGE,
    onAccent: INK,
    accentText: "#A94F1A",
    logoSrc: `${LOGO_DIR}/logo-color-on-light.svg`,
  },
  {
    id: "black",
    label: "Black",
    bg: INK,
    text: CREAM,
    muted: "#D4C4B0",
    accent: BRAND_ORANGE,
    onAccent: INK,
    accentText: BRAND_ORANGE,
    logoSrc: `${LOGO_DIR}/logo-color-on-dark.svg`,
  },
];

export const DEFAULT_THEME_ID: ThemeId = "orange";

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

export const LOGO_ASPECT = 1124 / 294.7;

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
