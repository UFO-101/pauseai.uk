import type { CSSProperties } from "react";

export type Chapter = {
  name: string;
  href: string;
  blurb: string;
  imageSrc: string;
  /** Extra background rules where the default cover crop misses the subject. */
  imageStyle?: CSSProperties;
  /** City centre, used to place the chapter's pin on the UK map. */
  lng: number;
  lat: number;
  /** Which side of the map the chapter's card sits on in the desktop layout. */
  side: "left" | "right";
};

// Sides follow geography — north and west on the left, the southern and
// eastern cluster on the right — so no connector has to cross the map to
// reach its own card. Within each side the cards run north to south.
export const chapters: Chapter[] = [
  {
    name: "Glasgow",
    href: "/glasgow",
    blurb: "Building momentum with public events and community outreach.",
    imageSrc: "/images/documentary-screening/G4W9UyLXwAA9ISl.jpeg",
    lng: -4.2518,
    lat: 55.8642,
    side: "left",
  },
  {
    name: "Manchester",
    href: "/manchester",
    blurb: "New chapter bringing AI safety conversations and action to the North West.",
    imageSrc: "/images/chapters/manchester/manchester_public.jpg",
    imageStyle: { backgroundSize: "110% auto", backgroundPosition: "center 22%" },
    lng: -2.2426,
    lat: 53.4808,
    side: "left",
  },
  {
    name: "West of England",
    href: "/west-of-england",
    blurb: "New chapter bringing AI safety conversations and action to Bristol and beyond.",
    imageSrc: "/images/chapters/west-of-england/bristol-launch.jpg",
    lng: -2.5879,
    lat: 51.4545,
    side: "left",
  },
  {
    name: "Leicester",
    href: "/leicester",
    blurb: "Growing community taking action locally and online.",
    imageSrc: "/images/chapters/leicester/london-2025-protest.jpg",
    lng: -1.1398,
    lat: 52.6369,
    side: "right",
  },
  {
    name: "Oxford",
    href: "/oxford",
    blurb: "University-driven dialogue on AI risk with researchers and students.",
    imageSrc: "/images/chapters/oxford/PauseAI Oxford.jpg",
    lng: -1.2577,
    lat: 51.752,
    side: "right",
  },
  {
    name: "London",
    href: "/london",
    blurb: "Book launches, letter-writing nights, and regular meetups in central London.",
    imageSrc: "/images/letter-writing/G2DG8xBXMAABxmR.jpeg",
    lng: -0.1276,
    lat: 51.5072,
    side: "right",
  },
];
