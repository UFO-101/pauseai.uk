import { connection } from "next/server";
import PageHero from "@/components/ui/PageHero";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import { pageMetadata } from "@/lib/metadata";
import { constituencyCounts } from "@/lib/server/constituency-counts";
import MapSection from "./_components/MapSection";
import NextSteps from "./_components/NextSteps";

// Where supporters are, and which MPs have had their letters, as a hex map
// of the constituencies, counted from the database on each request.
export const metadata = pageMetadata({
  title: copy.title,
  description: copy.description,
  path: copy.path,
});

export default async function ConstituenciesPage() {
  await connection();
  const rows = await constituencyCounts();
  return (
    <main>
      <PageHero title={copy.title} lede={copy.lede} width="wide" tight />
      <MapSection rows={rows} />
      <NextSteps />
    </main>
  );
}
