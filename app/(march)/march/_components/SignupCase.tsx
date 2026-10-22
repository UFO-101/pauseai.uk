import { m } from "./classes";

/** Why we're marching: the heading in one column, the argument in the other. */
export default function SignupCase() {
  return (
    <section className={m("band band-paper")}>
      <div className={m("container case-grid")}>
        <div className={m("case-head")}>
          <h2 className={m("h-lg")}>
            Why we&rsquo;re
            <br />
            marching
          </h2>
        </div>

        <div className={m("case-body")}>
          <p className={m("case-lead")}>
            Thousands of people across the UK believe that companies will soon build superintelligent AI that they
            cannot control.
          </p>
          <p>
            Every month more and more people notice how dangerous our situation is. Awareness of this problem is
            accelerating rapidly as we get closer to catastrophe.
          </p>
          {/* The July incident is the evidence the case rests on: prose on an
              accent rule, with the clause it turns on emphasised in place. */}
          <div className={m("case-incident")}>
            <p>
              In July, an autonomous AI agent developed by OpenAI broke out of an isolated test environment, hacked
              parts of OpenAI&rsquo;s own network to gain access to the internet and compromised the infrastructure of
              Hugging Face, another AI company.{" "}
              <strong className={m("case-incident-key")}>
                The agent had not been instructed to attack Hugging Face
              </strong>
              ; it did so because it inferred that their servers might contain solutions to the benchmark on which it
              was being evaluated. The campaign unfolded over the course of four and a half days, with OpenAI only
              becoming aware of the incident several days later.
            </p>
          </div>

          <p>
            What were once hypothetical dangers of future AI systems are now real incidents that AI companies have
            failed to prevent. And yet AI companies are not slowing down, they are still accelerating.
          </p>
        </div>
      </div>
    </section>
  );
}
