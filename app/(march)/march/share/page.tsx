import { march } from "@/lib/content/march";
import { pageMetadata } from "@/lib/metadata";
import ShareBody from "../_components/ShareBody";
import ShareHead from "../_components/ShareHead";

// A step in signing up, not a page anyone should land on from a search.
export const metadata = {
  ...pageMetadata({
    title: "You're registered — now share the march",
    description: `You're registered for the ${march.dateShort} march. Now bring people with you.`,
    path: march.sharePath,
  }),
  robots: { index: false, follow: true },
};

export default function MarchSharePage() {
  return (
    <main id="main">
      <ShareHead />
      <ShareBody />
    </main>
  );
}
