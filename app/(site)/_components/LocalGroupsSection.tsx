import { ButtonAnchor } from "@/components/ui/Button";
import LocalGroupsMap from "./LocalGroupsMap";

// The UK map of local groups, and how to start one.
export default function LocalGroupsSection() {
  return (
    <>
      <span id="chapters" className="anchor-alias" aria-hidden="true" />
      <section id="local-groups" className="section muted">
        <div className="container">
          <div className="section-header">
            <h2>Organising across the UK</h2>
            <p className="section-lede">
              Find your city and get involved. Each local group runs its own events, campaigns, and outreach.
            </p>
          </div>
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
      </section>
    </>
  );
}
