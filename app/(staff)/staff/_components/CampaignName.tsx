import StaffLink from "./ui/StaffLink";
import { campaignBySlug, campaignPath } from "@/lib/email-your-mp";

/**
 * A campaign by its name, linked to its public page; one no longer run by
 * the title the campaigns table gives it, linked to where its letter can be
 * read if the table has that, or by its slug where there's no `title` to
 * hand, as in an old entry of the audit log.
 */
export default function CampaignName({
  slug,
  title,
  url,
}: {
  slug: string;
  title?: string | null;
  url?: string | null;
}) {
  const campaign = campaignBySlug(slug);
  if (campaign) return <StaffLink href={campaignPath(campaign)}>{campaign.title}</StaffLink>;
  const name = title ?? slug;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer">
      {name}
    </a>
  ) : (
    <>{name}</>
  );
}
