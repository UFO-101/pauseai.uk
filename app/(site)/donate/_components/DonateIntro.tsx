import Image from "next/image";
import Link from "next/link";
import type { ThankedDonor } from "@/lib/server/outside-services/stripe";
import DonateForm from "./DonateForm";
import DonateThanks from "./DonateThanks";
import styles from "./DonateIntro.module.css";

// The donate form and the latest donors under it, with why to give beside them.
export default function DonateIntro({ donors }: { donors: ThankedDonor[] }) {
  return (
    <section className={styles.intro}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.head}>
            <h1>Let&apos;s press pause on unsafe AI together</h1>
          </div>

          <div className={styles.photo}>
            <Image
              src="/images/bristol-launch.webp"
              alt="PauseAI UK volunteers at a community event"
              width={1200}
              height={685}
              priority
            />
          </div>

          <div className={styles.text}>
            <p className={styles.lede}>
              PauseAI UK runs entirely on donations. We use our funding to pay for event venues, merchandise,
              administrative software and staff salaries. PauseAI Global has covered our costs so far, but from mid-2026
              we need to fund ourselves. You can see our full expenses and projected costs in our{" "}
              <a className="inline-link" href="/pdfs/Donor-Prospectus.pdf" target="_blank" rel="noreferrer">
                Donor Prospectus
              </a>
              .
            </p>
            <div className={styles.links}>
              <Link className={styles.link} href="/track-record/">
                <span className={styles.linkTitle}>Track record</span>
                <span className={styles.linkDesc}>What we&apos;ve achieved in our first year</span>
              </Link>
              <Link className={styles.link} href="/theory-of-change/">
                <span className={styles.linkTitle}>Theory of change</span>
                <span className={styles.linkDesc}>The strategy behind our work</span>
              </Link>
              <a
                className={`${styles.link} ${styles.doc}`}
                href="/pdfs/Donor-Prospectus.pdf"
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  className={styles.thumb}
                  src="/pdfs/Donor-Prospectus-thumb.jpg"
                  alt="Donor prospectus cover"
                  width={500}
                  height={707}
                  loading="lazy"
                />
                <span className={styles.docText}>
                  <span className={styles.linkTitle}>Donor prospectus (PDF)</span>
                  <span className={styles.linkDesc}>Our plans, finances and funding targets</span>
                </span>
              </a>
            </div>
          </div>

          <div className={styles.form}>
            <DonateForm />
            <DonateThanks donors={donors} />
          </div>
        </div>
      </div>
    </section>
  );
}
