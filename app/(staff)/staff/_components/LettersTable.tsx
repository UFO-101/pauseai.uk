import StaffLink from "./ui/StaffLink";
import CampaignName from "./CampaignName";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffTime } from "@/lib/staff-time";
import type { LetterSummary } from "@/lib/server/letters";
import { ListTable, type ListColumn } from "./ui/ListFrame";
import { Muted } from "@/components/ui/Text";
import TestTag from "./TestTag";

const copy = staffCopy.letters;

/** A letter's status, in words. */
const statusOf = (status: string) => copy.status[status] ?? status;

/**
 * The letters list's columns, as every list's go (docs/style-guide.md):
 * first its status, leading to the letter's page, as a letter has no
 * name; who it was from (leading to their supporter) and their email, and
 * to (leading to the MP's page), the campaign (leading to its page on the
 * site), how much of the letter is the sender's own words, and what sent
 * it; then when it was written, sent and when the MP replied, or failing
 * that, greyed, when an automatic reply came. A letter from the pauseai.info form is written
 * when its sender filled the form in, and sent later, when Airtable's
 * automation emailed it. Each is a sort (lib/letter-sort.ts), newest
 * written first unless another is chosen.
 */
const columns: ListColumn<LetterSummary>[] = [
  {
    key: "status",
    label: copy.columns.status,
    short: true,
    cell: (l) => (
      <>
        {statusOf(l.status)} · <StaffLink href={`/staff/letters/${l.id}`}>{staffCopy.mailingPages.theLetter}</StaffLink>
      </>
    ),
  },
  {
    key: "from",
    label: copy.columns.from,
    cell: (l) => (
      <>
        {l.supporterId === null ? (
          l.senderName
        ) : (
          <StaffLink href={`/staff/supporters/${l.supporterId}`}>{l.senderName}</StaffLink>
        )}
        <br />
        <Muted>{l.senderEmail}</Muted>
      </>
    ),
  },
  {
    key: "to",
    label: copy.columns.to,
    cell: (l) => (
      <>
        <StaffLink href={`/staff/politicians/${l.politicianId}`}>{l.mpName}</StaffLink>
        <TestTag isTest={l.isTest} />
      </>
    ),
  },
  {
    key: "campaign",
    label: copy.columns.campaign,
    cell: (l) => <CampaignName slug={l.campaign} title={l.campaignTitle} />,
  },
  {
    key: "ownWords",
    label: copy.columns.ownWords,
    short: true,
    // A letter with no draft, as from Airtable: a dash.
    cell: (l) => (l.ownWords === null ? <Muted>–</Muted> : copy.ownWords(l.ownWords)),
  },
  {
    key: "backend",
    label: copy.columns.backend,
    short: true,
    // Nothing yet sent it, as for Sent: a dash.
    cell: (l) => (l.backend ? copy.backends[l.backend] : <Muted>–</Muted>),
  },
  {
    key: "created",
    label: copy.columns.created,
    short: true,
    cell: (l) => staffTime(l.createdAt),
  },
  {
    key: "sent",
    label: copy.columns.sent,
    short: true,
    cell: (l) => (l.sentAt ? staffTime(l.sentAt) : <Muted>–</Muted>),
  },
  {
    key: "replied",
    label: copy.columns.replied,
    short: true,
    cell: (l) =>
      l.repliedAt
        ? staffTime(l.repliedAt)
        : l.autoRepliedAt && (
            // On a line of its own, so the column is no wider than a written reply's.
            <Muted>
              {copy.status.auto_reply}
              <br />
              {staffTime(l.autoRepliedAt)}
            </Muted>
          ),
  },
];

/** Letters, a row each, in the list's columns; or that there are none. */
export default function LettersTable({ letters }: { letters: LetterSummary[] }) {
  if (letters.length === 0) return <p>{copy.none}</p>;
  return <ListTable columns={columns} rows={letters} rowKey={(l) => l.id} />;
}
