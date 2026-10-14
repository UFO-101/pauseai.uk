import type { ReactNode } from "react";
import Image from "next/image";

/** The documents behind the campaign: DocCards. */
export default function CampaignDocs({ children }: { children: ReactNode }) {
  return (
    <section className="campaigns-docs">
      <div className="container">
        <h2>Read the case in full</h2>
        <div className="docs-grid">{children}</div>
      </div>
    </section>
  );
}

type DocCardProps = {
  /** File name in public/pdfs/, with a .jpg of the same name beside it. */
  file: string;
  /** "Open letter — June 2026". */
  kind: string;
  title: string;
  /** "Read the letter →". */
  cta: string;
};

/** One document, opened as a PDF. */
export function DocCard({ file, kind, title, cta }: DocCardProps) {
  return (
    <a className="doc-card" href={`/pdfs/${file}`} target="_blank" rel="noreferrer">
      <Image src={`/pdfs/${file.replace(/\.pdf$/, ".jpg")}`} alt="" width={2550} height={3300} loading="lazy" />
      <div className="doc-meta">
        <p className="doc-kind">{kind}</p>
        <h3>{title}</h3>
        <span className="doc-cta">{cta}</span>
      </div>
    </a>
  );
}
