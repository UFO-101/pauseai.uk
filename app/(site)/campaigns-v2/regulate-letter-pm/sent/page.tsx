import { copy } from "@/lib/content/email-your-mp";
import { pageMetadata } from "@/lib/metadata";
import LetterSent from "../../_components/LetterSent";
import LetterStep from "../../_components/LetterStep";

// After this campaign's letter is sent. Unlisted, and kept out of search.
export const metadata = {
  ...pageMetadata({ title: copy.sent.title, description: copy.sent.title, path: "/campaigns-v2/regulate-letter-pm/sent" }),
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <LetterStep title={copy.sent.title}>
      <LetterSent campaignSlug="regulate-letter-pm" />
    </LetterStep>
  );
}
