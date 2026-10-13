import { campaignBySlug } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LetterSummary } from "@/lib/server/letters";
import styles from "./staff.module.css";

const when = (at: string) => new Date(at).toLocaleString("en-GB");

/** Letters, with each change of status: sent, bounced, complained about. */
export default function LettersTable({ letters }: { letters: LetterSummary[] }) {
  if (letters.length === 0) return <p>{staffCopy.letters.none}</p>;
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{staffCopy.letters.columns.created}</th>
            <th>{staffCopy.letters.columns.from}</th>
            <th>{staffCopy.letters.columns.to}</th>
            <th>{staffCopy.letters.columns.campaign}</th>
            <th>{staffCopy.letters.columns.status}</th>
            <th>{staffCopy.letters.columns.history}</th>
          </tr>
        </thead>
        <tbody>
          {letters.map((letter) => (
            <tr key={letter.id}>
              <td>{when(letter.createdAt)}</td>
              <td>
                {letter.senderName}
                <br />
                <span className={styles.muted}>{letter.senderEmail}</span>
              </td>
              <td>
                {letter.mpName} {letter.isTest && <span className={styles.tag}>{staffCopy.politicians.testMp}</span>}
              </td>
              <td>{campaignBySlug(letter.campaign)?.title ?? letter.campaign}</td>
              <td>{staffCopy.letters.status[letter.status] ?? letter.status}</td>
              <td>
                <ul className={styles.events}>
                  {letter.events.map((event, i) => (
                    <li key={i}>
                      {when(event.at)}: {staffCopy.letters.status[event.status] ?? event.status}
                      {Object.keys(event.details).length > 0 && <code> {JSON.stringify(event.details)}</code>}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
