import { pageMetadata } from "@/lib/metadata";
import WorldMap from "./_components/WorldMap";
import CountryExplorer from "./_components/CountryExplorer";
import DemographicsExplorer from "./_components/DemographicsExplorer";
import { ReportLede, ReportSection, TheQuestion } from "./_components/Report";
import HeadlineStats from "./_components/HeadlineStats";
import Methodology from "./_components/Methodology";
import PageHero from "@/components/ui/PageHero";

const TITLE = "Global Attitudes to AI 2026";
const DESCRIPTION =
  "How 377,458 people across 104 countries feel about the development of superintelligent AI: an interactive look at the Nira Data Spring 2026 World Omnibus.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/global-ai-sentiment-2026",
});

export default function GlobalAiSentiment2026Page() {
  return (
    <>
      <main>
        <PageHero title={TITLE}>
          <ReportLede>{DESCRIPTION}</ReportLede>
        </PageHero>

        <HeadlineStats />

        <TheQuestion />

        <ReportSection title="Explore the map" intro="Select a country to see its full breakdown." muted>
          <WorldMap />
        </ReportSection>

        <ReportSection title="By demographic">
          <DemographicsExplorer />
        </ReportSection>

        <ReportSection title="All 104 countries" muted>
          <CountryExplorer />
        </ReportSection>

        <Methodology />
      </main>
    </>
  );
}
