import Image from "next/image";
import { ButtonAnchor } from "@/components/ui/Button";
import { site } from "@/lib/content/site";
import Section, { Lede } from "@/components/ui/Section";
import Callout from "@/components/ui/Callout";
import styles from "./ShopBanner.module.css";

// The merch shop.
export default function ShopBanner() {
  return (
    <Section tone="muted" bordered>
      <div className="container">
        <Callout>
          <div>
            <h2>Get PauseAI merch</h2>
            <Lede>
              T-shirts, hoodies, stickers and more – every purchase helps spread the word and supports our mission.
            </Lede>
            <ButtonAnchor variant="primary" size="large" href={site.shopUrl} target="_blank" rel="noreferrer">
              Browse the shop →
            </ButtonAnchor>
          </div>
          <a className={styles.imageLink} href={site.shopUrl} target="_blank" rel="noreferrer">
            <Image
              src="/images/fourthwall.avif"
              alt="PauseAI merchandise"
              className={styles.image}
              width={1536}
              height={2048}
              loading="lazy"
            />
          </a>
        </Callout>
      </div>
    </Section>
  );
}
