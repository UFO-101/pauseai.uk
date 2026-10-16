import Image from "next/image";
import { allCoverage, formatCoverageDate } from "@/lib/content/press-coverage";
import { site } from "@/lib/content/site";
import { ButtonAnchor } from "@/components/ui/Button";
import styles from "./PressKit.module.css";

// Media contact, boilerplate, brand assets and the coverage list.
export default function PressKit() {
  return (
    <article className={styles.article}>
      <div className="container">
        <section className={styles.section}>
          <h2>Media contact</h2>
          <div className={styles.contact}>
            <p>
              For interviews, comment, or background on PauseAI UK, contact <strong>Joseph Miller</strong>, UK Director,
              at <a href={`mailto:${site.pressEmail}`}>{site.pressEmail}</a>.
            </p>
            <ButtonAnchor variant="primary" href={`mailto:${site.pressEmail}?subject=Press%20enquiry`}>
              Email press team
            </ButtonAnchor>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Boilerplate</h2>
          <p>
            PauseAI UK is the civic movement dedicated to averting the risks of superhuman AI. Volunteers organise
            across local groups in London, Glasgow, Oxford, Leicester, Manchester, and the West of England, engaging
            MPs, joining conferences in the UK and European Parliaments, and marching in protests to push for a global
            pause on the development of AI systems more powerful than humans. PauseAI UK is strictly non-violent and is
            operated by Safe AI Alliance Ltd, a private company limited by guarantee.
          </p>
          <p>
            Read more on our <a href="/what-is-pauseai-uk/">what is PauseAI UK</a>,{" "}
            <a href="/track-record/">track record</a>, and <a href="/governance/">governance</a> pages.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Brand assets</h2>
          <p>
            High-resolution logos for editorial use. For photos of events or protests, contact the press team above.
          </p>
          <div className={styles.assets}>
            <a className={styles.assetCard} href="/images/logos/PauseAI-Logo-Transparent.svg" download>
              <Image src="/images/logos/PauseAI-Logo-Transparent.svg" alt="" width={178} height={48} />
              <span className={styles.assetCardLabel}>
                Wordmark
                <span className={styles.assetCardFormat}>SVG, transparent</span>
              </span>
            </a>
            <a className={styles.assetCard} href="/images/logos/Pause-Symbol.svg" download>
              <Image src="/images/logos/Pause-Symbol.svg" alt="" width={616} height={616} />
              <span className={styles.assetCardLabel}>
                Symbol
                <span className={styles.assetCardFormat}>SVG, transparent</span>
              </span>
            </a>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Press coverage</h2>
          <ul className={styles.coverageList}>
            {allCoverage.map((item) =>
              item.links ? (
                <li key={item.links[0].url} className={styles.coverageItem}>
                  <div className={`${styles.coverageLink} ${styles.coverageLinkStatic}`}>
                    <span className={styles.coverageDate}>{formatCoverageDate(item.date)}</span>
                    <span className={styles.coverageOutlet}>{item.outlet}</span>
                    <span className={styles.coveragePlatforms}>
                      {item.links.map((link, i) => (
                        <span key={link.url}>
                          {i > 0 && ", "}
                          <a href={link.url} target="_blank" rel="noreferrer">
                            {link.label}
                          </a>
                        </span>
                      ))}
                    </span>
                    <span className={styles.coverageTitle}>{item.title}</span>
                  </div>
                </li>
              ) : (
                <li key={item.url} className={styles.coverageItem}>
                  <a className={styles.coverageLink} href={item.url} target="_blank" rel="noreferrer">
                    <span className={styles.coverageDate}>{formatCoverageDate(item.date)}</span>
                    <span className={styles.coverageOutlet}>{item.outlet}</span>
                    <span className={styles.coverageMedium}>{item.medium}</span>
                    <span className={styles.coverageTitle}>{item.title}</span>
                  </a>
                </li>
              ),
            )}
          </ul>
        </section>
      </div>
    </article>
  );
}
