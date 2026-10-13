import { pageMetadata } from "@/lib/metadata";
import BoardSection from "./_components/BoardSection";
import DonationPolicies from "./_components/DonationPolicies";
import "../track-record/track-record.css";
import "./governance.css";

export const metadata = pageMetadata({
  title: "Governance",
  description: "The board that oversees PauseAI UK, and the due diligence we carry out before accepting donations.",
  path: "/governance",
});

export default function GovernancePage() {
  return (
    <>
      <main className="track-record governance">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Governance</h1>
          </div>
        </section>

        <BoardSection />

        <DonationPolicies />
      </main>
    </>
  );
}
