import { notFound } from "next/navigation";
import { campaigns } from "@/lib/content/email-your-mp";
import { campaignBySlug } from "@/lib/email-your-mp";
import { pageMetadata } from "@/lib/metadata";
import EmailYourMpPage from "../_components/EmailYourMpPage";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return campaigns.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params) {
  const campaign = campaignBySlug((await params).slug);
  if (!campaign) return {};
  return {
    ...pageMetadata({ title: campaign.title, description: campaign.description, path: `/email-your-mp-v2/${campaign.slug}` }),
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: Params) {
  const campaign = campaignBySlug((await params).slug);
  if (!campaign) notFound();
  return <EmailYourMpPage campaign={campaign} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />;
}
