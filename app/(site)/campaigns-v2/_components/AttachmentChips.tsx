import type { Attachment } from "@/lib/content/email-your-mp";
import styles from "./EmailYourMp.module.css";

/** A letter's attachments as a mail app shows them: a paperclip and the file's name, each opening the PDF. */
export default function AttachmentChips({ attachments, label }: { attachments: Attachment[]; label: string }) {
  return (
    <ul className={styles.attached} aria-label={label}>
      {attachments.map((attachment) => (
        <li key={attachment.file}>
          <a href={`/pdfs/${attachment.file}`} target="_blank" rel="noreferrer">
            {/* A paperclip (Lucide's, ISC licence). */}
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable={false}>
              <path
                d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {attachment.file}
          </a>
        </li>
      ))}
    </ul>
  );
}
