import { ButtonAnchor } from "@/components/ui/Button";
import { site } from "@/lib/content/site";
import Section, { Lede } from "@/components/ui/Section";

// The WhatsApp community and the event calendar.
export default function GetInvolved() {
  return (
    <Section id="get-involved" tone="white" bordered>
      <div className="container callout-inner">
        <div>
          <h2>Join the conversation</h2>
          <Lede>
            Our WhatsApp community is where we coordinate protests, share news, and plan what&apos;s next. It&apos;s the
            fastest way to stay in the loop.
          </Lede>
          <Lede>
            You can also browse upcoming meetups and actions on our{" "}
            <a className="inline-link" href={site.social.luma} target="_blank" rel="noreferrer">
              event calendar
            </a>
            .
          </Lede>
        </div>
        <ButtonAnchor variant="primary" size="large" href={site.whatsappUrl} target="_blank" rel="noreferrer">
          Join the WhatsApp community
        </ButtonAnchor>
      </div>
    </Section>
  );
}
