// A campaign's page (app/(site)/campaigns/_components/): its heading, the
// case for it, its documents, the form's section, the signatories, and the
// events after a letter.
import CampaignContext from "@/app/(site)/campaigns/_components/CampaignContext";
import CampaignDocs, { DocCard } from "@/app/(site)/campaigns/_components/CampaignDocs";
import CampaignHero, { HeroBand } from "@/app/(site)/campaigns/_components/CampaignHero";
import Signatories from "@/app/(site)/campaigns/_components/Signatories";
import SignatoriesList from "@/app/(site)/campaigns/_components/SignatoriesList";
import type { Group } from "../_components/types";
import {
  EmailYourMpSectionExample,
  MovedOnHeroExample,
  MovedOnNoticeExample,
  NearbyEventsExample,
  NearbyEventsOnlineExample,
} from "./campaigns-page.client";

const LETTER = {
  file: "Frontier-AI-Open-Letter.pdf",
  kind: "Open letter — January 2026",
  title: "An Example Letter",
  cta: "Read the letter →",
};
const BRIEFING = {
  file: "Frontier-AI-Risks-Policy-Briefing.pdf",
  kind: "Policy briefing — January 2026",
  title: "An Example Briefing",
  cta: "Read the briefing →",
};

export const campaignsPage: Group = {
  id: "campaigns-page",
  title: "A campaign's page",
  examples: [
    {
      name: "CampaignHero",
      file: "app/(site)/campaigns/_components/CampaignHero.tsx",
      variants: [
        {
          label: "A title and the button down to the form",
          render: () => <CampaignHero title="An Example Campaign" campaignSlug="regulate-letter-pm" />,
        },
        { label: "Moved on from another campaign's page", render: () => <MovedOnHeroExample /> },
      ],
    },
    {
      name: "HeroBand",
      file: "app/(site)/campaigns/_components/CampaignHero.tsx",
      variants: [
        {
          label: "A campaign's page",
          render: () => (
            <HeroBand>
              <h1>An Example Campaign</h1>
              <p>A line under the heading.</p>
            </HeroBand>
          ),
        },
        {
          label: "A step, in one centred column",
          render: () => (
            <HeroBand step>
              <h1>An example step</h1>
              <p>What follows the heading, the letter&rsquo;s width.</p>
            </HeroBand>
          ),
        },
      ],
    },
    {
      name: "MovedOnNotice",
      file: "app/(site)/campaigns/_components/MovedOnNotice.tsx",
      variants: [{ label: "Saying why the page moved on", render: () => <MovedOnNoticeExample /> }],
    },
    {
      name: "CampaignContext",
      file: "app/(site)/campaigns/_components/CampaignContext.tsx",
      variants: [
        {
          label: "Paragraphs",
          render: () => (
            <CampaignContext>
              <p>An example paragraph on why the campaign matters.</p>
              <p>
                A second, longer paragraph, which carries on for a while so that it wraps onto more than one line at the
                width of the page&rsquo;s reading column.
              </p>
            </CampaignContext>
          ),
        },
      ],
    },
    {
      name: "CampaignDocs",
      file: "app/(site)/campaigns/_components/CampaignDocs.tsx",
      variants: [
        {
          label: "Two documents",
          render: () => (
            <CampaignDocs>
              <DocCard {...LETTER} />
              <DocCard {...BRIEFING} />
            </CampaignDocs>
          ),
        },
      ],
    },
    {
      name: "DocCard",
      file: "app/(site)/campaigns/_components/CampaignDocs.tsx",
      variants: [
        {
          label: "One document, its first page and title",
          render: () => (
            <div className="container" style={{ maxWidth: 480 }}>
              <DocCard {...LETTER} />
            </div>
          ),
        },
      ],
    },
    {
      name: "EmailYourMpSection",
      file: "app/(site)/campaigns/_components/EmailYourMpSection.tsx",
      variants: [{ label: "The form's section, with the test MPs", render: () => <EmailYourMpSectionExample /> }],
    },
    {
      name: "Signatories",
      file: "app/(site)/campaigns/_components/Signatories.tsx",
      variants: [{ label: "The section, from the database", render: () => <Signatories /> }],
    },
    {
      name: "SignatoriesList",
      file: "app/(site)/campaigns/_components/SignatoriesList.tsx",
      variants: [
        {
          label: "The list alone, from the database",
          render: () => (
            <div className="container">
              <SignatoriesList />
            </div>
          ),
        },
      ],
    },
    {
      name: "NearbyEvents",
      file: "app/(site)/campaigns/_components/NearbyEvents.tsx",
      variants: [
        { label: "Near the sender, and online", render: () => <NearbyEventsExample /> },
        { label: "Not knowing where the sender is: online only", render: () => <NearbyEventsOnlineExample /> },
      ],
    },
  ],
};
