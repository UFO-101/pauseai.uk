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
            <Image src={`/pdfs/${attachment.thumbnail}`} alt="" width={900} height={1165} sizes="3rem" />
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
