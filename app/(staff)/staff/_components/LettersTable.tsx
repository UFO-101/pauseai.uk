import Link from "next/link";
import CampaignName from "./CampaignName";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffTime } from "@/lib/staff-time";
import type { LetterSummary } from "@/lib/server/letters";
import styles from "./LettersTable.module.css";
import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import Table from "@/components/ui/Table";

/**
 * Letters, with each change of status (sent, bounced, complained about) and
 * each reply. The sender leads to their supporter, the MP to their page,
 * the campaign to its page on the site.
 */
export default function LettersTable({ letters }: { letters: LetterSummary[] }) {
  if (letters.length === 0) return <p>{staffCopy.letters.none}</p>;
  return (
    <Table>
      <thead>
        <tr>
          <th>{staffCopy.letters.columns.created}</th>
          <th>{staffCopy.letters.columns.from}</th>
          <th>{staffCopy.letters.columns.consent}</th>
          <th>{staffCopy.letters.columns.to}</th>
          <th>{staffCopy.letters.columns.campaign}</th>
          <th>{staffCopy.letters.columns.status}</th>
          <th>{staffCopy.letters.columns.replied}</th>
          <th>{staffCopy.letters.columns.history}</th>
        </tr>
      </thead>
      <tbody>
        {letters.map((letter) => (
          <tr key={letter.id}>
            <td>{staffTime(letter.createdAt)}</td>
            <td>
              {letter.supporterId === null ? (
                letter.senderName
              ) : (
                <Link href={`/staff/supporters/${letter.supporterId}`}>{letter.senderName}</Link>
              )}
              <br />
              <Muted>{letter.senderEmail}</Muted>
            </td>
            <td>{letter.contactConsent ? staffCopy.letters.consent.yes : staffCopy.letters.consent.no}</td>
            <td>
              <Link href={`/staff/politicians/${letter.politicianId}`}>{letter.mpName}</Link>{" "}
              {letter.isTest && <Tag>{staffCopy.politicians.testMp}</Tag>}
            </td>
            <td>
              <CampaignName slug={letter.campaign} />
            </td>
            <td>{staffCopy.letters.status[letter.status] ?? letter.status}</td>
            <td>{letter.repliedAt && staffTime(letter.repliedAt)}</td>
            <td>
              <ul className={styles.events}>
                {letter.events.map((event, i) => (
                  <li key={i}>
                    {staffTime(event.at)}: {staffCopy.letters.status[event.status] ?? event.status}
                    {Object.keys(event.details).length > 0 && <code> {JSON.stringify(event.details)}</code>}
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
