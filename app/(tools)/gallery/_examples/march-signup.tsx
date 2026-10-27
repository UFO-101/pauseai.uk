// The march sign-up, the march's page (app/(march)/protests/march-against-ai-extinction-nov-26/_components/),
// each in the sub-site's frame, which gives it its type and colours.
import type { ReactNode } from "react";
import MarchSignupFrame from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/MarchSignupFrame";
import SignupCase from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupCase";
import SignupDay from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupDay";
import SignupDemand from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupDemand";
import SignupHeader from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupHeader";
import SignupHero from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupHero";
import SignupHeroScroll from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupHeroScroll";
import SignupPhotos from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupPhotos";
import SignupTurnout from "@/app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupTurnout";
import type { Group } from "../_components/types";
import { ShareCardExample, SignupFormExample, SignupRegisterExample } from "./march-signup.client";

const inFrame = (children: ReactNode) => <MarchSignupFrame>{children}</MarchSignupFrame>;

export const marchSignup: Group = {
  id: "march-signup",
  title: "The march sign-up",
  examples: [
    {
      name: "MarchSignupFrame",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/MarchSignupFrame.tsx",
      variants: [
        {
          label: "The sub-site's frame: its paper, type and skip link",
          render: () => inFrame(<p>An example paragraph.</p>),
        },
      ],
    },
    {
      name: "SignupHeader",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupHeader.tsx",
      variants: [
        { label: "The header, as it is past the hero", render: () => inFrame(<SignupHeader overHero={false} />) },
      ],
    },
    {
      name: "SignupHero",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupHero.tsx",
      variants: [{ label: "The sign-up page's first screen", render: () => inFrame(<SignupHero />) }],
    },
    {
      name: "SignupHeroScroll",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupHeroScroll.tsx",
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
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupCase.tsx",
      variants: [{ label: "Why we're marching", render: () => inFrame(<SignupCase />) }],
    },
    {
      name: "SignupDemand",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupDemand.tsx",
      variants: [{ label: "What we want", render: () => inFrame(<SignupDemand />) }],
    },
    {
      name: "SignupTurnout",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupTurnout.tsx",
      variants: [{ label: "The turnouts and the press", render: () => inFrame(<SignupTurnout />) }],
    },
    {
      name: "SignupPhotos",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupPhotos.tsx",
      variants: [{ label: "Photos from earlier marches", render: () => inFrame(<SignupPhotos />) }],
    },
    {
      name: "SignupDay",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupDay.tsx",
      variants: [{ label: "On the day", render: () => inFrame(<SignupDay />) }],
    },
    {
      name: "SignupRegister",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupRegister.tsx",
      variants: [{ label: "The register band, with the form", render: () => <SignupRegisterExample /> }],
    },
    {
      name: "SignupForm",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupForm.tsx",
      variants: [{ label: "The form, whose action logs what it's sent", render: () => <SignupFormExample /> }],
    },
    {
      name: "SignupFlow",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/SignupFlow.tsx",
      variants: [
        { label: "The cards, starting with the form, in the register band", render: () => <SignupRegisterExample /> },
      ],
    },
    {
      name: "ShareCard",
      file: "app/(march)/protests/march-against-ai-extinction-nov-26/_components/ShareCard.tsx",
      variants: [{ label: "The share card, after registering", render: () => <ShareCardExample /> }],
    },
  ],
};
