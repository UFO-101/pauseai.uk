import type { MarchRegisterResult } from "@/lib/march-registration";
import { m } from "./classes";
import SignupFlow from "./SignupFlow";

/** The register band: what to expect, and the form and the cards after it. `register` is as SignupFlow's. */
export default function SignupRegister({ register }: { register?: (input: unknown) => Promise<MarchRegisterResult> }) {
  return (
    <section id="register" className={m("band band-ink")}>
      <div className={m("container register-grid")}>
        <div className={m("register-intro")}>
          <h2 className={m("h-lg")}>Register for the march</h2>
          <p className={m("lede register-lede")}>
            Registering helps us know how many people to expect and lets us keep you updated before the day.
          </p>

          <h3 className={m("h-sm register-subhead")}>What to expect</h3>
          <ol className={m("register-list")}>
            <li>
              This event will be <strong>family friendly, law-abiding and strictly non-violent</strong>.
            </li>
            <li>
              PauseAI is a <strong>big tent</strong> movement. Everyone is welcome, whatever their politics.
            </li>
            <li>We will coordinate with the police ahead of the march.</li>
          </ol>
        </div>

        <SignupFlow register={register} />
      </div>
    </section>
  );
}
