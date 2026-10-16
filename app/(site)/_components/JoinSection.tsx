import OnboardingFormEmbed from "./OnboardingFormEmbed";
import Section, { Lede, SectionHeader } from "@/components/ui/Section";

// The onboarding form, embedded from pauseai.info.
export default function JoinSection() {
  return (
    <Section id="join">
      <div className="container">
        <SectionHeader title="Join PauseAI UK">
          <Lede>Fill out the form below to get involved.</Lede>
        </SectionHeader>
        <div className="tally-embed">
          <OnboardingFormEmbed />
        </div>
      </div>
    </Section>
  );
}
