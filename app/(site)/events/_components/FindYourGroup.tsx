import Link from "next/link";
import styles from "./FindYourGroup.module.css";

// Under the full list of events: a pointer to the local groups.
export default function FindYourGroup() {
  return (
    <p className={styles.note}>
      Looking for something near you? <Link href="/#local-groups">Find your local group</Link>.
    </p>
  );
}
