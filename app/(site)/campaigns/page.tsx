import { pageMetadata } from "@/lib/metadata";
import "./campaigns.css";
import { ButtonAnchor } from "@/components/ui/Button";
import CampaignContext from "./_components/CampaignContext";
import CampaignDocs from "./_components/CampaignDocs";
import EmailYourMp from "./_components/EmailYourMp";
import Signatories from "./_components/Signatories";
import ShareQr from "./_components/ShareQr";

export const metadata = pageMetadata({
  title: "Campaigns",
  description: "Take action on AI safety. Email your MP, join campaigns, and help build pressure for a global pause.",
  path: "/campaigns",
});

export default function CampaignsPage() {
  return (
    <main className="campaigns">
      <section className="campaigns-hero">
        <div className="container">
          <h1>Regulate AI developers now</h1>
          <p className="hero-cta-row">
            <ButtonAnchor variant="primary" href="#email-your-mp">
              Email your MP &rarr;
            </ButtonAnchor>
          </p>
        </div>
      </section>

      <CampaignContext />

      <CampaignDocs />

      <EmailYourMp />

      <Signatories />

      <ShareQr />
    </main>
  );
}
