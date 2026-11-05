import { campaignBySlug } from "@/lib/email-your-mp";
import StaffLink from "./ui/StaffLink";

/**
 * A campaign by its name, leading to its page here, or plain for staff who
 * can't open that page. `title` is the campaigns table's, for one no longer
 * in the site's code, or its slug where there's no `title` to hand, as in an
 * old entry of the audit log.
 */
export default function CampaignName({
  slug,
  title,
  linked = true,
}: {
  slug: string;
  title?: string | null;
  linked?: boolean;
}) {
  const name = campaignBySlug(slug)?.title ?? title ?? slug;
  return linked ? <StaffLink href={`/staff/campaigns/${slug}`}>{name}</StaffLink> : <>{name}</>;
}
