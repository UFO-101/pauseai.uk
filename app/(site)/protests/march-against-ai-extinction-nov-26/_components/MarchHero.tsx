import { ButtonAnchor } from "@/components/ui/Button";
import { march } from "@/lib/content/march";
import styles from "./MarchHero.module.css";

// The title, when and where, and the way to register (on Luma).
export default function MarchHero() {
  return (
    <section className={styles.hero}>
      <div className={"container"}>
        <h1>{march.name}</h1>
        <p className={styles.when}>
          <strong>21 November 2026, 12–3pm</strong>
          <br />
          <strong>Start:</strong> {march.start.address}
          <br />
          <strong>End:</strong> {march.end.address}
        </p>
        <p className={styles.ctaRow}>
          <ButtonAnchor variant="primary" href={march.lumaUrl}>
            Register &rarr;
          </ButtonAnchor>
        </p>
      </div>
    </section>
  );
}
