import Image from "next/image";
import type { Attachment } from "@/lib/content/email-your-mp";
import styles from "./EmailYourMp.module.css";

/** A letter's attachments, each a small card: its first page, title and file name, opening the PDF. */
export default function AttachmentChips({ attachments, label }: { attachments: Attachment[]; label: string }) {
  return (
    <ul className={styles.attached} aria-label={label}>
      {attachments.map((attachment) => (
        <li key={attachment.file}>
          <a href={`/pdfs/${attachment.file}`} target="_blank" rel="noreferrer">
            {/* Shown 3rem wide. A small width, not sizes, so the browser
                only has small files to choose from: with sizes it took
                whichever large copy the campaign page had loaded, and scaled
                it down a little differently each time. 900 × 1165, scaled. */}
            <Image src={`/pdfs/${attachment.thumbnail}`} alt="" width={180} height={233} />
            <span className={styles.attachedText}>
              <strong>{attachment.title}</strong>
              <span>{attachment.subtitle}</span>
              <small>{attachment.file}</small>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
