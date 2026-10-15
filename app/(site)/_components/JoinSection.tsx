import OnboardingFormEmbed from "./OnboardingFormEmbed";

// The onboarding form, embedded from pauseai.info.
export default function JoinSection() {
  return (
    <section id="join" className="section container">
      <div className="section-header">
        <h2>Join PauseAI UK</h2>
        <p className="section-lede">Fill out the form below to get involved.</p>
      </div>
      <div className="tally-embed">
        <OnboardingFormEmbed />
      </div>
    </section>
  );
}
