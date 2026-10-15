import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/content/site";
import HeroSwirl from "./_components/HeroSwirl";
import Lightbox from "./_components/Lightbox";
import Timeline from "./_components/Timeline";
import "./track-record.css";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";

export const metadata = pageMetadata({
  title: "Track Record",
  description:
    "One year of PauseAI UK: two conferences, an open letter signed by 60+ politicians, a European Parliament event, and the largest AI protest in the world.",
  path: "/track-record",
});

export default function TrackRecordPage() {
  return (
    <>
      <main className="track-record">
        <section className="tr-hero">
          <HeroSwirl />
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Track Record</h1>
          </div>
        </section>

        <Timeline />

        <section className="closing">
          <div className="container closing-inner">
            <p className="closing-sub">Join us for what comes next.</p>
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
      </main>

      <Lightbox />
    </>
  );
}
