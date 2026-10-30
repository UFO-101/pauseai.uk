import Link from "next/link";
import { campaignBySlug, campaignPath } from "@/lib/email-your-mp";

/**
 * A campaign by its name, linked to its public page; one no longer run by
 * the title the campaigns table gives it, plain, or by its slug where
 * there's no `title` to hand, as in an old entry of the audit log.
 */
export default function CampaignName({ slug, title }: { slug: string; title?: string }) {
  const campaign = campaignBySlug(slug);
  return campaign ? <Link href={campaignPath(campaign)}>{campaign.title}</Link> : <>{title ?? slug}</>;
}
