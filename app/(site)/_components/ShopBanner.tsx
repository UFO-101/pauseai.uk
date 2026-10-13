import Image from "next/image";
import { ButtonAnchor } from "@/components/ui/Button";
import { site } from "@/lib/content/site";

// The merch shop.
export default function ShopBanner() {
  return (

    <section className="section shop-banner">
      <div className="container callout-inner">
        <div>
          <h2>Get PauseAI merch</h2>
          <p className="section-lede">
            T-shirts, hoodies, stickers and more – every purchase helps spread the word and supports our mission.
          </p>
          <ButtonAnchor variant="primary" size="large" href={site.shopUrl} target="_blank" rel="noreferrer">Browse the shop →</ButtonAnchor>
        </div>
        <a className="shop-image-link" href={site.shopUrl} target="_blank" rel="noreferrer">
          <Image src="/images/fourthwall.avif" alt="PauseAI merchandise" className="shop-image" width={1536} height={2048} loading="lazy" />
        </a>
      </div>
    </section>
  );
}
