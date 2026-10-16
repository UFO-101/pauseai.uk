import Image from "next/image";
import { board } from "@/lib/content/board";
import styles from "./BoardSection.module.css";

// The board members, with links to their websites and X accounts.
export default function BoardSection() {
  return (
    <section className={styles.board}>
      <div className={`container ${styles.inner}`}>
        <h2>Our board</h2>
        <div className={styles.boardGrid}>
          {board.map((member) => (
            <article key={member.name} className={styles.boardCard}>
              <Image className={styles.boardPhoto} src={member.imageSrc} alt={member.name} width={320} height={320} />
              <h3 className={styles.boardName}>{member.name}</h3>
              <p className={styles.boardRole}>{member.role}</p>
              <div className={styles.boardLinks}>
                <a
                  href={member.website}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${member.name} website`}
                  title="Website"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <circle cx="12" cy="12" r="9.5" />
                    <ellipse cx="12" cy="12" rx="4.2" ry="9.5" />
                    <path d="M2.9 8.8h18.2M2.9 15.2h18.2" strokeLinecap="round" />
                  </svg>
                </a>
                <a href={member.x} target="_blank" rel="noreferrer" aria-label={`${member.name} on X`} title="X">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
