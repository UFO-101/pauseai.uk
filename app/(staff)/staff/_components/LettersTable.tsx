import Link from "next/link";
import { campaignBySlug, campaignPath } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffTime } from "@/lib/staff-time";
import type { LetterSummary } from "@/lib/server/letters";
import styles from "./LettersTable.module.css";
import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import Table from "@/components/ui/Table";

/** The campaign's title, linked to its page on the site; a slug no campaign has any more, as it is. */
function Campaign({ slug }: { slug: string }) {
  const campaign = campaignBySlug(slug);
  return campaign ? <Link href={campaignPath(campaign)}>{campaign.title}</Link> : slug;
}

/**
 * Letters, with each change of status (sent, bounced, complained about) and
 * each reply. The sender leads to their supporter, the MP to their page,
 * the campaign to its page on the site. Who wrote, and whether they agreed
 * to be contacted, are shown only to staff who may see supporters.
 */
export default function LettersTable({ letters, showSenders }: { letters: LetterSummary[]; showSenders: boolean }) {
  if (letters.length === 0) return <p>{staffCopy.letters.none}</p>;
  return (
    <Table>
      <thead>
        <tr>
          <th>{staffCopy.letters.columns.created}</th>
          {showSenders && (
            <>
              <th>{staffCopy.letters.columns.from}</th>
              <th>{staffCopy.letters.columns.consent}</th>
            </>
          )}
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
            {showSenders && (
              <>
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
              </>
            )}
            <td>
              <Link href={`/staff/politicians/${letter.politicianId}`}>{letter.mpName}</Link>{" "}
              {letter.isTest && <Tag>{staffCopy.politicians.testMp}</Tag>}
            </td>
            <td>
              <Campaign slug={letter.campaign} />
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
