import { pageMetadata } from "@/lib/metadata";
import { getThankedDonors } from "@/lib/server/outside-services/stripe";
import DonateIntro from "./_components/DonateIntro";
import DonateBottom from "./_components/DonateBottom";

export const metadata = pageMetadata({
  title: "Donate",
  description: "Support PauseAI UK — community-led action for safe and accountable AI.",
  path: "/donate",
  openGraph: {
    title: "Donate to PauseAI UK",
    description: "Support community-led action for safe and accountable AI across the UK.",
    url: "https://pauseai.uk/donate",
  },
});

// The donors under the form come from Stripe (getThankedDonors, cached for an hour).
export default async function DonatePage() {
  const donors = await getThankedDonors();
  return (
    <>
      <main>
        <DonateIntro donors={donors} />

        <DonateBottom />
      </main>
    </>
  );
}
