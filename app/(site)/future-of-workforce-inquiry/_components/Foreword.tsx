import ForewordBand from "@/components/ui/Foreword";

// Why the inquiry happened and how PauseAI UK responded, above the submission.
export default function Foreword() {
  return (
    <ForewordBand title="About this inquiry" dropCap pageWidth>
      <p>
        In March 2026, the House of Commons Business and Trade Committee opened an inquiry into{" "}
        <em>Artificial Intelligence, business and the future of the workforce</em>. The Committee called for written
        evidence submissions from businesses, trade unions, academics, civil society organisations, and the public.
      </p>
      <p>
        PauseAI UK volunteers worked collaboratively to research and write a detailed submission which outlines our
        views about the likely impact that AI will have on the job market and the future of employment.
      </p>
      <p>
        We argue that the Committee should plan for scenarios far more disruptive than AI as a mere chatbot assistant.
        They should prepare for scenarios in which autonomous AI agents can perform the vast majority of economically
        valuable work, making many people unemployable through no fault of their own. We argue that only an
        international pause in frontier AI development will be sufficient to prevent catastrophic economic and social
        destabilisation.
      </p>
      <p>The full text of our submission is reproduced below, as originally submitted.</p>
    </ForewordBand>
  );
}
