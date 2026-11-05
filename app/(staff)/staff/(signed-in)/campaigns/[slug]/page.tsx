import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { campaignTabCounts, campaignVersions, getCampaignSummary } from "@/lib/server/campaigns";
import { listLetters } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { lettersSearch, type LettersSearch, type ParamValue } from "@/lib/staff-search";
import Breadcrumb from "../../../_components/Breadcrumb";
import CampaignView from "../../../_components/CampaignView";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Partial<Record<keyof LettersSearch, ParamValue>>>;
};

export async function generateMetadata({ params }: Pick<Params, "params">): Promise<Metadata> {
  await requireStaff("supporters");
  return { title: found(await getCampaignSummary((await params).slug)).title };
}

/** A campaign: its counts, each version of its letter, and its letters, searched and filtered. */
export default async function CampaignPage({ params, searchParams }: Params) {
  await requireStaff("supporters");
  const { slug } = await params;
  const campaign = found(await getCampaignSummary(slug));
  const { filter, ...search } = lettersSearch({ ...(await searchParams), campaign: slug });
  const [letters, { versions, bands }, tabCounts] = await Promise.all([
    listLetters(filter),
    campaignVersions(slug),
    campaignTabCounts(slug),
  ]);
  return (
    <>
      <Breadcrumb href="/staff/campaigns">{staffCopy.campaigns.title}</Breadcrumb>
      <CampaignView
        campaign={campaign}
        versions={versions}
        bands={bands}
        letters={letters}
        search={search}
        tabCounts={tabCounts}
      />
    </>
  );
}
