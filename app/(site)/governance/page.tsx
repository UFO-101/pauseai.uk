import { pageMetadata } from "@/lib/metadata";
import BoardSection from "./_components/BoardSection";
import DonationPolicies from "./_components/DonationPolicies";
import "./governance.css";
import PageHero from "@/components/ui/PageHero";

export const metadata = pageMetadata({
  title: "Governance",
  description: "The board that oversees PauseAI UK, and the due diligence we carry out before accepting donations.",
  path: "/governance",
});

export default function GovernancePage() {
  return (
    <>
      <main className="governance">
        <PageHero title="Governance" />

        <BoardSection />

        <DonationPolicies />
      </main>
    </>
  );
}
