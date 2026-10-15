import { pageMetadata } from "@/lib/metadata";
import JsonLd from "@/components/layout/JsonLd";
import { march, marchEventJsonLd } from "@/lib/content/march";
import MarchHero from "./_components/MarchHero";
import MarchArticle from "./_components/MarchArticle";
import "./march.css";

// The words are the Luma event's description, so the page says what Luma says.
export const metadata = pageMetadata({
  title: march.name,
  description:
    "21 November 2026, 12–3pm. Start: All Souls' Place, London W1B 3DA. End: Downing Street, London SW1A 2AA.",
  path: march.path,
});

export default function MarchPage() {
  return (
    <main className="march">
      <JsonLd data={marchEventJsonLd()} />
      <MarchHero />
      <MarchArticle />
    </main>
  );
}
