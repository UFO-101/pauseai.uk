import type { ReactNode } from "react";
import Image from "next/image";
import styles from "./CampaignDocs.module.css";

/** The documents behind the campaign: DocCards. */
export default function CampaignDocs({ children }: { children: ReactNode }) {
  return (
    <section className={styles.docs}>
      <div className="container">
        <h2>Read the case in full</h2>
        <div className={styles.docsGrid}>{children}</div>
      </div>
    </section>
  );
}

type DocCardProps = {
  /** File name in public/pdfs/, with a .jpg of the same name beside it. */
  file: string;
  /** "Open letter". */
  kind?: string;
  title: string;
  /** "Read the letter →". */
  cta?: string;
};

/** One document, opened as a PDF. */
export function DocCard({ file, kind, title, cta }: DocCardProps) {
  return (
    <a className={styles.docCard} href={`/pdfs/${file}`} target="_blank" rel="noreferrer">
      <Image
        src={`/pdfs/${file.replace(/\.pdf$/, ".jpg")}`}
        alt=""
        width={2550}
        height={3300}
        // Two columns of up to 440px, or one, the screen's width, on a phone.
        sizes="(max-width: 640px) 100vw, 440px"
        loading="lazy"
      />
      <div className={styles.docMeta}>
        {kind && <p className={styles.docKind}>{kind}</p>}
        <h3>{title}</h3>
        {cta && <span className={styles.docCta}>{cta}</span>}
      </div>
    </a>
  );
}
