import { site } from "@/lib/content/site";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";

// The call to action at the bottom of the page.
export default function Closing() {
  return (
    <section className="closing">
      <div className="container closing-inner">
        <div className="closing-actions">
          <ButtonAnchor variant="primary" href={site.whatsappUrl} target="_blank" rel="noreferrer">
            Join the WhatsApp community
          </ButtonAnchor>
          <ButtonLink variant="ghost" href="/#join">
            More ways to get involved
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
