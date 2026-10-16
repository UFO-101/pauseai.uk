import { ButtonAnchor } from "@/components/ui/Button";
import LocalGroupsMap from "./LocalGroupsMap";
import Section, { Lede, SectionHeader } from "@/components/ui/Section";

// The UK map of local groups, and how to start one.
export default function LocalGroupsSection() {
  return (
    <>
      <span id="chapters" className="anchor-alias" aria-hidden="true" />
      <Section id="local-groups" tone="muted">
        <div className="container">
          <SectionHeader title="Organising across the UK">
            <Lede>Find your city and get involved. Each local group runs its own events, campaigns, and outreach.</Lede>
          </SectionHeader>
          <LocalGroupsMap />
          <div className="start-local-group-cta">
            <div className="start-local-group-cta-copy">
              <h3>Don&apos;t see your city?</h3>
              <p>
                Bring PauseAI to your city. We&apos;ll share playbooks, visuals, and support to launch local actions.
              </p>
            </div>
            <ButtonAnchor
              variant="primary"
              size="large"
              href="https://docs.google.com/document/d/1wVqsjGatoP3ltspkeqnyeye7I1d_V8XYRPQGaGyvitQ/edit?usp=sharing"
              target="_blank"
              rel="noreferrer"
            >
              Start a local group →
            </ButtonAnchor>
          </div>
        </div>
      </Section>
    </>
  );
}
