import { IndexCard } from "@/components/tools/CardIndex";

export interface Tool {
  href: string;
  title: string;
  description: string;
  /** Lives on another site, so it opens in a new tab. */
  external?: boolean;
}

export const TOOLS: Tool[] = [
  {
    href: "/tools/collateral",
    title: "Collateral maker",
    description:
      "Make PauseAI UK branded flyers, posters, event and social media images, and photo carousels. Pick a format and a style, add your text, photo and QR codes, then download a PNG, plus a print-ready PDF for flyers and posters.",
  },
  {
    href: "/tools/qr",
    title: "QR code generator",
    description:
      "Make a QR code for any web address, with an optional PauseAI pause symbol in the middle. Download it as a PNG or an SVG.",
  },
  {
    href: "https://catalyse.up.railway.app",
    title: "Catalyse",
    description:
      "Volunteer project platform for PauseAI. It allows anyone to join projects or complete tasks that help advance our mission. You can also propose your own projects to get help from other volunteers on things that you want to work on.",
    external: true,
  },
];

// A card per tool. External tools open in a new tab.
export default function ToolGrid() {
  return TOOLS.map((tool) => (
    <IndexCard
      key={tool.href}
      href={tool.href}
      title={tool.title}
      cta={tool.external ? "Visit ↗" : "Open →"}
      external={tool.external}
    >
      <p>{tool.description}</p>
    </IndexCard>
  ));
}
