import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./AccountTitle.module.css";

/** Your own page's title, and under it the address you're logged in as, larger than the page's text. */
export default function AccountTitle({ email }: { email: string }) {
  return (
    <>
      <h1>{staffCopy.me.title}</h1>
      <p className={styles.address}>{email}</p>
    </>
  );
}
