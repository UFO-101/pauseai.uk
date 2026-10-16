import Image from "next/image";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { HERO_PHOTOS } from "@/lib/content/hero-photos";
import { shuffle } from "@/lib/shuffle";
import styles from "./HomeHero.module.css";

// The home page hero: three rows of photos scrolling in alternating
// directions behind the headline (HeroMarqueeEffects measures and starts them).
export default function HomeHero() {
  // Server-component shuffle: a new order each render (the same order in a
  // fixture build, lib/shuffle.ts). Sent to the client as part of the
  // rendered HTML so hydration matches.
  const shuffled = shuffle(HERO_PHOTOS);
  // Share the photos across three rows so none are dropped as the list grows.
  const perRow = Math.ceil(shuffled.length / 3);
  const heroRows = [
    { dir: "ltr" as const, photos: shuffled.slice(0, perRow) },
    { dir: "rtl" as const, photos: shuffled.slice(perRow, perRow * 2) },
    { dir: "ltr" as const, photos: shuffled.slice(perRow * 2) },
  ];

  return (
    <section id="about">
      <div className={styles.marquee}>
        {heroRows.map((row, ri) => (
          <div key={ri} className={row.dir === "rtl" ? `${styles.row} ${styles.rtl}` : styles.row}>
            <div className={styles.track} data-marquee-track="hero">
              {[0, 1].map((copyIdx) => (
                <div
                  key={copyIdx}
                  className={styles.copy}
                  data-marquee-copy=""
                  {...(copyIdx > 0 ? { "aria-hidden": true } : {})}
                >
                  {[...row.photos, ...row.photos].map(([src, alt, width, height], i) => {
                    const isPrimary = copyIdx === 0 && i < row.photos.length;
                    const isLcp = ri === 0 && copyIdx === 0 && i === 0;
                    return (
                      <Image
                        key={i}
                        src={`/images/front-page-hero-optimized/${src}`}
                        alt={isPrimary ? alt : ""}
                        width={width}
                        height={height}
                        aria-hidden={!isPrimary || undefined}
                        loading={isLcp ? undefined : "lazy"}
                        priority={isLcp}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className={styles.overlay}>
          <div className={styles.text}>
            <h1>
              Organising for
              <br />
              our future
            </h1>
            <p className={styles.lede}>
              We are the civic movement dedicated to averting the risks of superhuman artificial intelligence.
            </p>
            <div className={styles.actions}>
              <ButtonAnchor variant="primary" href="#join">
                Join PauseAI UK
              </ButtonAnchor>
              <div className={styles.secondary}>
                <ButtonAnchor variant="light" href="#events">
                  Upcoming events ↓
                </ButtonAnchor>
                <ButtonLink variant="light" href="/track-record/">
                  Track record →
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
