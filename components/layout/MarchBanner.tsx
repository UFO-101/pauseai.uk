"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { isMarchPromoted, march } from "@/lib/content/march";
import styles from "./MarchBanner.module.css";

/** The date only matters once per page load, so there's nothing to subscribe to. */
function noSubscription() {
  return () => {};
}

// A strip under the header on every page until the march: the date and place
// and the march's name (to its page here), and Register (to Luma). Not on the
// march's own page, which is what it points to.
export default function MarchBanner() {
  const onMarchPage = usePathname().replace(/\/$/, "") === march.path;
  // The date is checked in the browser, since a page built before the march
  // would otherwise keep the banner until it's rebuilt. The server always
  // renders it, so hydration matches either way.
  const promoted = useSyncExternalStore(
    noSubscription,
    () => isMarchPromoted(new Date()),
    () => true,
  );
  if (!promoted || onMarchPage) return null;

  return (
    <aside className={styles.banner} aria-label={march.name}>
      <div className={styles.inner}>
        <Link href={`${march.path}/`} className={styles.link}>
          <span className={styles.when}>Sat 21 Nov · London</span>
          <span className={styles.name}>{march.name}</span>
        </Link>
        <a href={march.lumaUrl} className={styles.register}>
          Register &rarr;
        </a>
      </div>
    </aside>
  );
}
