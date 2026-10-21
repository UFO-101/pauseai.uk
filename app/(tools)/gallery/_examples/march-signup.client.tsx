"use client";

// The march sign-up's examples that call back: the form, whose Server Action logs what it's sent.
import type { MarchRegisterResult } from "@/app/(march)/march/actions";
import MarchSignupFrame from "@/app/(march)/march/_components/MarchSignupFrame";
import SignupForm from "@/app/(march)/march/_components/SignupForm";
import { Logged } from "../_components/wiring";

/** The form, sent to a stand-in for the Server Action that logs the sign-up and says Luma failed, so it stays put. */
export function SignupFormExample() {
  return (
    <Logged>
      {(log) => (
        <MarchSignupFrame>
          <div style={{ maxWidth: 560, padding: 24 }}>
            <SignupForm
              register={async (input): Promise<MarchRegisterResult> => {
                log("register")(input);
                return { ok: false, reason: "luma-failed" };
              }}
            />
          </div>
        </MarchSignupFrame>
      )}
    </Logged>
  );
}
