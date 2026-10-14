import { redirect } from "next/navigation";
import { campaigns } from "@/lib/content/email-your-mp";
import { campaignPath } from "@/lib/email-your-mp";

// Opens the first campaign in priority order. A redirect, not a page, as
// each campaign's page moves on from there (plans/email-your-mp-v2.md).
export default function Page() {
  redirect(campaignPath(campaigns[0]));
}
