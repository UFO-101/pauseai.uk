"use client";

// The march sign-up's examples that call back: the form, and the band it's
// in, whose Server Action is a stand-in that logs what it's sent.
import type { MarchRegisterResult } from "@/app/(march)/march/actions";
import MarchSignupFrame from "@/app/(march)/march/_components/MarchSignupFrame";
import SignupForm from "@/app/(march)/march/_components/SignupForm";
import SignupRegister from "@/app/(march)/march/_components/SignupRegister";
import { Logged } from "../_components/wiring";

/** Logs the sign-up and says Luma failed, so the form stays put. */
const loggedRegister =
  (log: (name: string) => (...args: unknown[]) => void) =>
  async (input: unknown): Promise<MarchRegisterResult> => {
    log("register")(input);
    return { ok: false, reason: "luma-failed" };
  };

/** The register band, with the form sent to the stand-in. */
export function SignupRegisterExample() {
  return (
    <Logged>
      {(log) => (
        <MarchSignupFrame>
          <SignupRegister register={loggedRegister(log)} />
        </MarchSignupFrame>
      )}
    </Logged>
  );
}

/** The form on its own, sent to the stand-in. */
export function SignupFormExample() {
  return (
    <Logged>
      {(log) => (
        <MarchSignupFrame>
          <div style={{ maxWidth: 560, padding: 24 }}>
            <SignupForm register={loggedRegister(log)} />
          </div>
        </MarchSignupFrame>
      )}
    </Logged>
  );
}
