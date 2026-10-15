import { copy } from "@/lib/content/email-your-mp";
import { pageMetadata } from "@/lib/metadata";
import { getEvents } from "@/lib/server/luma-calendar";
import LetterSent from "../../_components/LetterSent";
import LetterStep from "../../_components/LetterStep";
import NearbyEvents from "../../_components/NearbyEvents";

// After this campaign's letter is sent, with events near the sender. Unlisted, and kept out of search.
export const metadata = {
  ...pageMetadata({ title: copy.sent.title, description: copy.sent.title, path: "/campaigns-v2/support-sobel-bill/sent" }),
  robots: { index: false, follow: false },
};

export default async function Page() {
  const events = await getEvents();
  return (
    <LetterStep title={copy.sent.title} after={<NearbyEvents campaignSlug="support-sobel-bill" events={events} />}>
      <LetterSent campaignSlug="support-sobel-bill" />
    </LetterStep>
  );
}
