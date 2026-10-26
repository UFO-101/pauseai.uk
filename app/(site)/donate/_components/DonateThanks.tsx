import type { ThankedDonor } from "@/lib/server/outside-services/stripe";
import styles from "./DonateThanks.module.css";

/** How many of the latest donors the box names. */
const LATEST = 5;

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" });

// Under the donate form: the latest donors who said yes to the wall of
// thanks at checkout, each with the month they gave, and how many there are
// in all. Nothing when there's nobody.
export default function DonateThanks({ donors }: { donors: ThankedDonor[] }) {
  if (donors.length === 0) return null;
  return (
    <section className={styles.thanks} aria-labelledby="donate-thanks">
      <h2 id="donate-thanks" className={styles.heading}>
        ⁂ Thank you to our latest donors
      </h2>
      <ul className={styles.list}>
        {donors.slice(0, LATEST).map((donor) => (
          <li key={`${donor.name} ${donor.givenAt}`} className={styles.donor}>
            <span className={styles.name}>{donor.name}</span>
            <time className={styles.when} dateTime={donor.givenAt}>
              {MONTH.format(new Date(donor.givenAt))}
            </time>
          </li>
        ))}
      </ul>
      <p className={styles.count}>⁂ {donors.length} donors have said yes to being named on our wall of thanks.</p>
    </section>
  );
}
