import { pageMetadata } from "@/lib/metadata";
import DemisLetterBackground from "./_components/DemisLetterBackground";
import DemisLetterHelp from "./_components/DemisLetterHelp";
import DemisLetterHero from "./_components/DemisLetterHero";
import DemisLetterQuotes from "./_components/DemisLetterQuotes";
import DemisLetterSignatories from "./_components/DemisLetterSignatories";
import DemisLetterText from "./_components/DemisLetterText";

// The open letter from UK parliamentarians to Google DeepMind, August 2025.
// It moved here from pauseai.info/dear-sir-demis-2025, which redirects to it.
export const metadata = pageMetadata({
  title: "Letter to Sir Demis Hassabis",
  description: "Parliamentarians from across the UK call on Google DeepMind to honour their AI safety commitments",
  path: "/campaigns/dear-sir-demis-2025",
});

export default function Page() {
  return (
    <main>
      <DemisLetterHero />
      <DemisLetterQuotes />
      <DemisLetterText />
      <DemisLetterSignatories />
      <DemisLetterBackground />
      <DemisLetterHelp />
    </main>
  );
}
