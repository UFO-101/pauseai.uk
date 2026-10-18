import Section from "@/components/ui/Section";
import styles from "./DemisLetterText.module.css";

/** The letter itself, as the parliamentarians signed it. */
export default function DemisLetterText() {
  return (
    <Section tone="muted">
      <div className="container">
        <article className={styles.letter}>
          <div className={styles.addresses}>
            <p>
              <strong>From:</strong> PauseAI UK
              <br />5 Brayford Square
              <br />
              London E1 0SG
            </p>
            <p>
              <strong>To:</strong> Sir Demis Hassabis
              <br />
              Chief Executive Officer, Google DeepMind
              <br />
              London, United Kingdom
            </p>
          </div>

          <p>Dear Sir Demis,</p>

          <p>
            We write to express profound concern about Google DeepMind&apos;s failure to honour the Frontier AI Safety
            Commitments signed at the AI Seoul Summit in 2024. The release of Gemini 2.5 Pro without the transparency
            required by paragraph VIII of the commitments represents a troubling breach of trust with governments and
            the public.
          </p>

          <p>At the AI Seoul Summit, Google explicitly committed to:</p>
          <ul>
            <li>
              Conducting safety tests &quot;before deploying&quot; AI models with input from &quot;independent
              third-party evaluators&quot; as appropriate.
            </li>
            <li>Providing &quot;public transparency&quot; into testing processes.</li>
            <li>
              Disclosing &quot;how, if at all, external actors, such as governments... are involved in the
              process&quot;.
            </li>
          </ul>

          <p>
            Yet when you released Gemini 2.5 Pro on 25 March, no safety evaluation report accompanied it. A month later,
            only a minimal &quot;model card&quot; appeared, lacking any substantive detail about external evaluations.
            Even when directly questioned by journalists, Google refused to confirm whether government agencies like the
            UK AI Security Institute participated in testing.
          </p>

          <p className={styles.emphasis}>
            This is not a matter of semantics or technicalities. Labelling a publicly accessible model as
            &quot;experimental&quot; does not absolve Google of its safety obligations. When anyone on the internet can
            use a frontier AI system, it has been deployed in every meaningful sense.
          </p>

          <p>
            You yourself have stated that AGI may arrive within five years. Leading AI researchers, such as Geoffrey
            Hinton and Yoshua Bengio, estimate a 10% or greater chance that advanced AI could cause human extinction.
            These are not distant hypotheticals but near-term possibilities requiring immediate, serious action.
          </p>

          <p>
            We are particularly troubled that Google, having helped establish these safety standards, would be among the
            first to abandon them. This sets a dangerous precedent that undermines global efforts to develop AI safely.
            If industry leaders treat safety commitments as optional when convenient, how can we expect others to take
            them seriously?
          </p>

          <div className={styles.demands}>
            <p>
              <strong>We therefore call on Google DeepMind to:</strong>
            </p>
            <ol>
              <li>
                Establish clear definitions of &quot;deployment&quot; that align with common understanding - when a
                model is publicly accessible, it is deployed.
              </li>
              <li>
                Publish a specific timeline for when safety evaluation reports will be released for all future models.
              </li>
              <li>
                Clarify unambiguously, for each model release, which government agencies and independent third-parties
                are involved in testing, and the exact timelines of their testing procedures.
              </li>
            </ol>
          </div>

          <p>
            The development of artificial general intelligence may be humanity&apos;s most consequential undertaking. It
            demands the highest standards of responsibility, transparency, and caution. Google&apos;s technical
            capabilities come with commensurate obligations to society.
          </p>

          <p>We await your response and concrete actions to address these critical concerns.</p>

          <p>Yours sincerely,</p>
        </article>
      </div>
    </Section>
  );
}
