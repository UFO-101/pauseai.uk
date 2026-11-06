import type { ReactNode } from "react";
import styles from "./Alert.module.css";
import Strip from "./ui/Strip";

/**
 * A message on the page that something is wrong or waiting, as a strip read
 * out at once (ui/Strip): red for an error, as an alert; amber for something
 * waiting, as a status. It keeps its own room above and below.
 */
export default function Alert({ tone = "red", children }: { tone?: "amber" | "red"; children: ReactNode }) {
  return (
    <div className={styles.alert}>
      <Strip tone={tone} announce>
        <span>{children}</span>
      </Strip>
    </div>
  );
}
