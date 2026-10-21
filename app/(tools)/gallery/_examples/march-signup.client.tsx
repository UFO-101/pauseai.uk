"use client";

// The march sign-up's examples that call back: the cards, whose callbacks
// log, and the form and the register band, whose Server Action is a stand-in
// that logs what it's sent and says Luma failed, so the form stays put.
import type { MarchRegisterResult } from "@/app/(march)/march/actions";
import MarchSignupFrame from "@/app/(march)/march/_components/MarchSignupFrame";
import ShareCard from "@/app/(march)/march/_components/ShareCard";
import SignupForm from "@/app/(march)/march/_components/SignupForm";
import SignupRegister from "@/app/(march)/march/_components/SignupRegister";
import ThanksCard from "@/app/(march)/march/_components/ThanksCard";
import type { ReactNode } from "react";
import { Logged } from "../_components/wiring";

type Log = (name: string) => (...args: unknown[]) => void;

const loggedRegister =
  (log: Log) =>
  async (input: unknown): Promise<MarchRegisterResult> => {
    log("register")(input);
    return { ok: false, reason: "luma-failed" };
  };

/** A card on its own, at the width it has in the register band. */
const card = (children: ReactNode) => (
  <MarchSignupFrame>
    <div style={{ maxWidth: 560, padding: 24 }}>{children}</div>
  </MarchSignupFrame>
);

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
      {(log) =>
        card(
          <SignupForm
            register={loggedRegister(log)}
            onRegistered={log("onRegistered")}
            motion="still"
            onLeft={log("onLeft")}
          />,
        )
      }
    </Logged>
  );
}

export function ShareCardExample() {
  return (
    <Logged>{(log) => card(<ShareCard onFinish={log("onFinish")} motion="still" onLeft={log("onLeft")} />)}</Logged>
  );
}

export function ThanksCardExample() {
  return (
    <Logged>
      {(log) => card(<ThanksCard onRegisterAnother={log("onRegisterAnother")} motion="still" onLeft={log("onLeft")} />)}
    </Logged>
  );
}
