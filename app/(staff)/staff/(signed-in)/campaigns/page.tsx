import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { now } from "@/lib/now";
import { listCampaignSummaries } from "@/lib/server/campaigns";
import { requireStaff } from "@/lib/server/staff-auth";
import CampaignsOverview from "../../_components/CampaignsOverview";
import PageIntro from "../../_components/ui/PageIntro";

export const metadata: Metadata = { title: staffCopy.campaigns.title };

/** Every campaign, each under the month of its most recent letter. */
export default async function CampaignsPage() {
  await requireStaff("supporters");
  return (
    <>
      <h1>{staffCopy.campaigns.title}</h1>
      <PageIntro>{staffCopy.campaigns.intro}</PageIntro>
      <CampaignsOverview campaigns={await listCampaignSummaries()} now={now().toISOString()} />
    </>
  );
}
