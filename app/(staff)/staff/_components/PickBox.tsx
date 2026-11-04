"use client";

import { useEffect, useOptimistic, useRef, useTransition } from "react";
import styles from "./PickBox.module.css";

/**
 * A tick box that saves as it's clicked, by `action`, with whether it's now
 * ticked; it shows the click at once, and what's saved once the page has
 * it. `some` shows it part ticked, as the box over a list is when only
 * some of its rows are.
 */
export default function PickBox({
  ticked,
  some = false,
  label,
  action,
}: {
  ticked: boolean;
  some?: boolean;
  label: string;
  action: (ticked: boolean) => Promise<void>;
}) {
  const [shown, show] = useOptimistic(ticked);
  const [pending, start] = useTransition();
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    box.current!.indeterminate = some && !pending;
  }, [some, pending]);
  return (
    <input
      ref={box}
      type="checkbox"
      className={styles.box}
      aria-label={label}
      checked={shown}
      onChange={(event) => {
        const now = event.target.checked;
        start(async () => {
          show(now);
          await action(now);
        });
      }}
    />
  );
}
