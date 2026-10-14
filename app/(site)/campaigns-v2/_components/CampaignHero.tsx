import { ButtonAnchor } from "@/components/ui/Button";

/** A campaign page's heading, with a button down to the form. */
export default function CampaignHero({ title }: { title: string }) {
  return (
    <section className="campaigns-hero">
      <div className="container">
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
