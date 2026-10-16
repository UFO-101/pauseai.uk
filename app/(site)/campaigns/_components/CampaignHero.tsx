import { ButtonAnchor } from "@/components/ui/Button";
import MovedOnNotice from "./MovedOnNotice";

/** A campaign page's heading, with a button down to the form. */
export default function CampaignHero({ title, campaignSlug }: { title: string; campaignSlug: string }) {
  return (
    <section className="campaigns-hero">
      <div className="container">
        <MovedOnNotice campaignSlug={campaignSlug} />
        <h1>{title}</h1>
        <p className="hero-cta-row">
          <ButtonAnchor variant="primary" href="#email-your-mp">
            Email your MP &rarr;
          </ButtonAnchor>
        </p>
      </div>
    </section>
  );
}
