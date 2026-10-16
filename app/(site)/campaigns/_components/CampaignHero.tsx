import type { ReactNode } from "react";
import { ButtonAnchor } from "@/components/ui/Button";
import MovedOnNotice from "./MovedOnNotice";
import styles from "./CampaignHero.module.css";

/**
 * The heading band at the top of a campaign's pages. A `step` (writing the
 * letter, its preview, "sent") sets its heading and what follows in one
 * centred column, the letter's width.
 */
export function HeroBand({ step = false, children }: { step?: boolean; children: ReactNode }) {
  return (
    <section className={step ? `${styles.hero} ${styles.step}` : styles.hero}>
      <div className="container">{step ? <div className={styles.column}>{children}</div> : children}</div>
    </section>
  );
}

/** A campaign page's heading, with a button down to the form. */
export default function CampaignHero({ title, campaignSlug }: { title: string; campaignSlug: string }) {
  return (
    <HeroBand>
      <MovedOnNotice campaignSlug={campaignSlug} />
      <h1>{title}</h1>
      <p className={styles.ctaRow}>
        <ButtonAnchor variant="primary" href="#email-your-mp">
          Email your MP &rarr;
        </ButtonAnchor>
      </p>
    </HeroBand>
  );
}
