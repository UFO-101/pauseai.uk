import { demisLetterOrganisations, demisLetterParliamentarians } from "@/lib/content/dear-sir-demis-2025";
import styles from "./dear-sir-demis.module.css";

/** The letter's heading, with who signed it in three numbers. */
export default function DemisLetterHero() {
  const stats = [
    { number: String(demisLetterOrganisations().length), label: "Civil Society Organisations" },
    { number: "10+", label: "Political Parties" },
    { number: String(demisLetterParliamentarians().length), label: "Parliamentarians" },
  ];

  return (
    <section className={styles.hero}>
      <div className="container">
        <p className={styles.eyebrow}>Open Letter</p>
        <h1>Letter to Sir Demis Hassabis</h1>
        <p className={styles.lede}>
          Parliamentarians from across the UK call on Google DeepMind to honour their AI safety commitments
        </p>
        <dl className={styles.stats}>
          {stats.map(({ number, label }) => (
            <div key={label} className={styles.stat}>
              <dt>{label}</dt>
              <dd>{number}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.date}>
          <time dateTime="2025-08-29">29 August 2025</time>
        </p>
      </div>
    </section>
  );
}
