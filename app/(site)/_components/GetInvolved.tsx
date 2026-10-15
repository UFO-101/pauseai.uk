import { ButtonAnchor } from "@/components/ui/Button";
import { site } from "@/lib/content/site";

// The WhatsApp community and the event calendar.
export default function GetInvolved() {
  return (
    <section id="get-involved" className="section callout">
      <div className="container callout-inner">
        <div>
          <h2>Join the conversation</h2>
          <p className="section-lede">
            Our WhatsApp community is where we coordinate protests, share news, and plan what&apos;s next. It&apos;s the
            fastest way to stay in the loop.
          </p>
          <p className="section-lede">
            You can also browse upcoming meetups and actions on our{" "}
            <a className="inline-link" href={site.social.luma} target="_blank" rel="noreferrer">
              event calendar
            </a>
            .
          </p>
        </div>
        <ButtonAnchor variant="primary" size="large" href={site.whatsappUrl} target="_blank" rel="noreferrer">
          Join the WhatsApp community
        </ButtonAnchor>
      </div>
    </section>
  );
}
