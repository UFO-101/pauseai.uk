"use client";

// A campaign page's examples that read what Email your MP keeps in the
// browser: client components with no props, so the server-rendered gallery
// can place them.
import { campaigns } from "@/lib/content/email-your-mp";
import CampaignHero from "@/app/(site)/campaigns/_components/CampaignHero";
import { exampleLookup } from "@/app/(site)/campaigns/_components/draft.examples";
import EmailYourMpSection from "@/app/(site)/campaigns/_components/EmailYourMpSection";
import MovedOnNotice from "@/app/(site)/campaigns/_components/MovedOnNotice";
import NearbyEvents from "@/app/(site)/campaigns/_components/NearbyEvents";
import { exampleEvents, westminster } from "@/app/(site)/campaigns/_components/NearbyEvents.examples";
import { Seeded } from "./campaigns-letter.client";

const [letterToPm, bill] = campaigns;

/** "Find my MP" on the PM's page, for an MP who'd signed it: the page moved on to the bill's. */
const movedOn = {
  ...exampleLookup,
  campaign: bill.slug,
  statuses: { [letterToPm.slug]: "signed" as const },
  movedFrom: letterToPm.slug,
};

/** The bill's heading, after the PM's page moved on to it. */
export function MovedOnHeroExample() {
  return (
    <Seeded lookup={movedOn}>
      <CampaignHero title="An Example Campaign" campaignSlug={bill.slug} />
    </Seeded>
  );
}

/** The notice alone, saying why the page moved on. */
export function MovedOnNoticeExample() {
  return (
    <Seeded lookup={movedOn}>
      <div className="container">
        <MovedOnNotice campaignSlug={bill.slug} />
      </div>
    </Seeded>
  );
}

/** The section with its form, filled in from the last lookup, and the test MPs listed. */
export function EmailYourMpSectionExample() {
  return (
    <Seeded lookup={exampleLookup}>
      <EmailYourMpSection campaignSlug={letterToPm.slug} showTestMps />
    </Seeded>
  );
}

/** After a letter from Westminster: the events near it, and online ones. */
export function NearbyEventsExample() {
  return (
    <Seeded lookup={{ ...exampleLookup, place: westminster }}>
      <NearbyEvents campaignSlug={letterToPm.slug} events={exampleEvents} />
    </Seeded>
  );
}

/** Not knowing where the sender is: online events only. */
export function NearbyEventsOnlineExample() {
  return (
    <Seeded lookup={{ ...exampleLookup, place: null }}>
      <NearbyEvents campaignSlug={letterToPm.slug} events={exampleEvents} />
    </Seeded>
  );
}
