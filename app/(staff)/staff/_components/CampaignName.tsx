import Link from "next/link";
import { campaignBySlug, campaignPath } from "@/lib/email-your-mp";

/** A campaign by its name, linked to its public page; one no longer run, by its slug, plain. */
export default function CampaignName({ slug }: { slug: string }) {
  const campaign = campaignBySlug(slug);
  return campaign ? <Link href={campaignPath(campaign)}>{campaign.title}</Link> : <>{slug}</>;
}
