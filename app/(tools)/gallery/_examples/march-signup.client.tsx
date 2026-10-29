"use client";

// The march sign-up's examples that call back: the cards, whose callbacks
// log, and the form and the register band, whose register is a stand-in
// that logs what it's sent and says Luma failed, so the form stays put.
import type { MarchRegisterResult } from "@/lib/march-registration";
import MarchSignupFrame from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/MarchSignupFrame";
import MarchSignups from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/MarchSignups";
import ShareCard from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/ShareCard";
import SignupForm from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupForm";
import SignupRegister from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupRegister";
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
          <MarchSignups signups={1234}>
            <SignupRegister register={loggedRegister(log)} />
          </MarchSignups>
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
            signups={1234}
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
    <Logged>
      {(log) =>
        card(
          <ShareCard
            email="testy@example.org"
            onRegisterAnother={log("onRegisterAnother")}
            motion="still"
            onLeft={log("onLeft")}
          />,
        )
      }
    </Logged>
  );
}
