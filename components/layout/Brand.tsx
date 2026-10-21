import Image from "next/image";
import Link from "next/link";
import type { LocalGroup } from "@/lib/content/local-groups";
import styles from "./Brand.module.css";

/**
 * The PauseAI UK logo and "UK", as a link home in the header or plain in
 * the footer. On a local group's page the header shows the group's own
 * logo, or the pause symbol with its name.
 */
export default function Brand({ home, localGroup }: { home?: boolean; localGroup?: LocalGroup }) {
  const mark = localGroup ? (
    localGroup.logo ? (
      <Image
        src={localGroup.logo.src}
        alt=""
        width={localGroup.logo.width}
        height={localGroup.logo.height}
        className={styles.mark}
      />
    ) : (
      <>
        <Image src="/images/logos/Pause-Symbol.svg" alt="" width={616} height={616} className={styles.mark} />
        <div className={styles.text}>
          <span className={styles.pretitle}>PauseAI UK</span>
          <span className={styles.tagline}>{localGroup.name} Group</span>
        </div>
      </>
    )
  ) : (
    <>
      <Image
        src="/images/logos/PauseAI-Logo-Transparent.svg"
        alt="PauseAI UK"
        width={178}
        height={48}
        className={styles.mark}
      />
      <span className={styles.uk}>UK</span>
    </>
  );
  return home ? (
    <Link className={styles.link} href="/">
      {mark}
    </Link>
  ) : (
    <div className={styles.brand}>{mark}</div>
  );
}
