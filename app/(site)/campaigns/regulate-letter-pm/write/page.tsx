import { copy } from "@/lib/content/email-your-mp";
import { pageMetadata } from "@/lib/metadata";
import LetterStep from "../../_components/LetterStep";
import LetterWrite from "../../_components/LetterWrite";

// Writing this campaign's letter, after finding the MP. Unlisted, and kept out of search.
export const metadata = {
  ...pageMetadata({
    title: copy.write.title,
    description: copy.write.title,
    path: "/campaigns/regulate-letter-pm/write",
  }),
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <LetterStep title={copy.write.title}>
      <LetterWrite campaignSlug="regulate-letter-pm" />
    </LetterStep>
  );
}
