import { copy } from "@/lib/content/email-your-mp";
import { pageMetadata } from "@/lib/metadata";
import EmailYourMpPage from "./_components/EmailYourMpPage";

// Version 2 of Email your MP, built here until it replaces /campaigns'
// embed (plans/email-your-mp-v2.md). Unlisted, and kept out of search.
export const metadata = {
  ...pageMetadata({ title: copy.pageTitle, description: copy.pageDescription, path: "/email-your-mp-v2" }),
  robots: { index: false, follow: false },
};

export default function Page() {
  return <EmailYourMpPage turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />;
}
