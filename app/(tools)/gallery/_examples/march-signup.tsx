// The march sign-up at /march and its share step (app/(march)/march/_components/),
// each in the sub-site's frame, which gives it its type and colours.
import type { ReactNode } from "react";
import MarchSignupFrame from "@/app/(march)/march/_components/MarchSignupFrame";
import ShareActions from "@/app/(march)/march/_components/ShareActions";
import ShareBody from "@/app/(march)/march/_components/ShareBody";
import ShareHead from "@/app/(march)/march/_components/ShareHead";
import SignupCase from "@/app/(march)/march/_components/SignupCase";
import SignupDay from "@/app/(march)/march/_components/SignupDay";
import SignupDemand from "@/app/(march)/march/_components/SignupDemand";
import SignupHeader from "@/app/(march)/march/_components/SignupHeader";
import SignupHero from "@/app/(march)/march/_components/SignupHero";
import SignupHeroScroll from "@/app/(march)/march/_components/SignupHeroScroll";
import SignupPhotos from "@/app/(march)/march/_components/SignupPhotos";
import SignupTurnout from "@/app/(march)/march/_components/SignupTurnout";
import type { Group } from "../_components/types";
import { SignupFormExample, SignupRegisterExample } from "./march-signup.client";

const inFrame = (children: ReactNode) => <MarchSignupFrame>{children}</MarchSignupFrame>;

export const marchSignup: Group = {
  id: "march-signup",
  title: "The march sign-up",
  examples: [
    {
      name: "MarchSignupFrame",
      file: "app/(march)/march/_components/MarchSignupFrame.tsx",
      variants: [
        {
          label: "The sub-site's frame: its paper, type and skip link",
          render: () => inFrame(<p>An example paragraph.</p>),
        },
      ],
    },
    {
      name: "SignupHeader",
      file: "app/(march)/march/_components/SignupHeader.tsx",
      variants: [{ label: "The header, as on the share step", render: () => inFrame(<SignupHeader />) }],
    },
    {
      name: "SignupHero",
      file: "app/(march)/march/_components/SignupHero.tsx",
      variants: [{ label: "The sign-up page's first screen", render: () => inFrame(<SignupHero />) }],
    },
    {
      name: "SignupHeroScroll",
      file: "app/(march)/march/_components/SignupHeroScroll.tsx",
      variants: [
        {
          label: "The scroll cue, on its own on ink",
          render: () =>
            inFrame(
              <div style={{ position: "relative", height: 96, background: "var(--march-ink)" }}>
                <SignupHeroScroll />
              </div>,
            ),
        },
      ],
    },
    {
      name: "SignupCase",
      file: "app/(march)/march/_components/SignupCase.tsx",
      variants: [{ label: "Why we're marching", render: () => inFrame(<SignupCase />) }],
    },
    {
      name: "SignupDemand",
      file: "app/(march)/march/_components/SignupDemand.tsx",
      variants: [{ label: "What we want", render: () => inFrame(<SignupDemand />) }],
    },
    {
      name: "SignupTurnout",
      file: "app/(march)/march/_components/SignupTurnout.tsx",
      variants: [{ label: "The turnouts and the press", render: () => inFrame(<SignupTurnout />) }],
    },
    {
      name: "SignupPhotos",
      file: "app/(march)/march/_components/SignupPhotos.tsx",
      variants: [{ label: "Photos from earlier marches", render: () => inFrame(<SignupPhotos />) }],
    },
    {
      name: "SignupDay",
      file: "app/(march)/march/_components/SignupDay.tsx",
      variants: [{ label: "On the day", render: () => inFrame(<SignupDay />) }],
    },
    {
      name: "SignupRegister",
      file: "app/(march)/march/_components/SignupRegister.tsx",
      variants: [{ label: "The register band, with the form", render: () => <SignupRegisterExample /> }],
    },
    {
      name: "SignupForm",
      file: "app/(march)/march/_components/SignupForm.tsx",
      variants: [{ label: "The form, whose action logs what it's sent", render: () => <SignupFormExample /> }],
    },
    {
      name: "ShareHead",
      file: "app/(march)/march/_components/ShareHead.tsx",
      variants: [{ label: "The top of the share step", render: () => inFrame(<ShareHead />) }],
    },
    {
      name: "ShareBody",
      file: "app/(march)/march/_components/ShareBody.tsx",
      variants: [{ label: "The share step's band, with the share card", render: () => inFrame(<ShareBody />) }],
    },
    {
      name: "ShareActions",
      file: "app/(march)/march/_components/ShareActions.tsx",
      variants: [{ label: "The share card, before anything's shared", render: () => inFrame(<ShareActions />) }],
    },
  ],
};
