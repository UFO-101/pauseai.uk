import { copy } from "@/lib/content/email-your-mp";
import { pageMetadata } from "@/lib/metadata";
import { getEventsWithPlaces } from "@/lib/server/luma-calendar";
import LetterSent from "../../_components/LetterSent";
import LetterStep from "../../_components/LetterStep";
import NearbyEvents from "../../_components/NearbyEvents";

// After this campaign's letter is sent, with events near the sender. Unlisted, and kept out of search.
export const metadata = {
  ...pageMetadata({ title: copy.sent.title, description: copy.sent.title, path: "/campaigns-v2/regulate-letter-pm/sent" }),
  robots: { index: false, follow: false },
};

export default async function Page() {
  const events = await getEventsWithPlaces();
  return (
    <LetterStep title={copy.sent.title} after={<NearbyEvents campaignSlug="regulate-letter-pm" events={events} />}>
      <LetterSent campaignSlug="regulate-letter-pm" />
    </LetterStep>
  );
}
