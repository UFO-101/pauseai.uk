import StaffLink from "./ui/StaffLink";
import CampaignName from "./CampaignName";
import { staffCopy } from "@/lib/content/staff-interface";
import { campaignBySlug } from "@/lib/email-your-mp";
import type { DownloadColumn } from "@/lib/staff-list";
import { staffTime } from "@/lib/staff-time";
import type { LetterSummary } from "@/lib/server/letters";
import { filtersPath, pageParam, type LettersSearch } from "@/lib/staff-search";
import ListFrame, { ListTable, type ListColumn } from "./ui/ListFrame";
import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";

const PATH = "/staff/letters";
const copy = staffCopy.letters;

/** A letter's status, in words. */
const statusOf = (status: string) => copy.status[status] ?? status;

/**
 * The letters list's columns, as every list's go (docs/style-guide.md):
 * first its status, leading to the letter's page, as a letter has no
 * name; who it was from (leading to their supporter) and their email, and
 * to (leading to the MP's page), and the campaign (leading to its page on
 * the site); whether the sender agreed to hear from us; then when it was
 * sent and when the MP replied.
 */
export const letterColumns: ListColumn<LetterSummary>[] = [
  {
    key: "status",
    label: copy.columns.status,
    short: true,
    text: (l) => statusOf(l.status),
    cell: (l) => <StaffLink href={`/staff/letters/${l.id}`}>{statusOf(l.status)}</StaffLink>,
  },
  {
    key: "from",
    label: copy.columns.from,
    text: (l) => `${l.senderName} <${l.senderEmail}>`,
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
    text: (l) => l.mpName,
    cell: (l) => (
      <>
        <StaffLink href={`/staff/politicians/${l.politicianId}`}>{l.mpName}</StaffLink>{" "}
        {l.isTest && <Tag>{staffCopy.politicians.flags.test}</Tag>}
      </>
    ),
  },
  {
    key: "campaign",
    label: copy.columns.campaign,
    text: (l) => campaignBySlug(l.campaign)?.title ?? l.campaignTitle,
    cell: (l) => (
      <>
        <CampaignName slug={l.campaign} title={l.campaignTitle} url={l.campaignUrl} />{" "}
        {l.imported && <Tag>{copy.imported}</Tag>}
      </>
    ),
  },
  {
    key: "consent",
    label: copy.columns.consent,
    short: true,
    text: (l) => l.contactConsent,
    cell: (l) => (l.contactConsent ? copy.consent.yes : copy.consent.no),
  },
  {
    key: "sent",
    label: copy.columns.sent,
    short: true,
    text: (l) => l.sentAt,
    cell: (l) => (l.sentAt ? staffTime(l.sentAt) : <Muted>–</Muted>),
  },
  {
    key: "replied",
    label: copy.columns.replied,
    short: true,
    text: (l) => l.repliedAt,
    cell: (l) => l.repliedAt && staffTime(l.repliedAt),
  },
];

/** The list's columns for a download, with when each was written and each change of status, which its page shows. */
export const letterDownloadColumns: DownloadColumn<LetterSummary>[] = [
  ...letterColumns,
  { key: "created", label: copy.columns.created, text: (l) => l.createdAt },
  {
    key: "history",
    label: copy.columns.history,
    text: (l) => l.events.map((event) => `${event.at} ${statusOf(event.status)}`).join("; "),
  },
];

/** Letters, a row each, in the list's columns; or that there are none. */
export default function LettersTable({ letters }: { letters: LetterSummary[] }) {
  if (letters.length === 0) return <p>{copy.none}</p>;
  return <ListTable columns={letterColumns} rows={letters} rowKey={(l) => l.id} />;
}

/** The letters page's list, in the list frame: how many, its downloads, the letters and the way through the pages. */
export function LettersList({
  letters,
  total,
  pages,
  pageSize,
  search,
}: {
  letters: LetterSummary[];
  total: number;
  pages: number;
  pageSize: number;
  search: LettersSearch;
}) {
  const filters = { ...search, page: "" };
  return (
    <ListFrame
      count={copy.total(total)}
      total={total}
      page={Number(search.page) || 1}
      pages={pages}
      pageSize={pageSize}
      href={(n) => filtersPath(PATH, filters, pageParam(n))}
      download={(format) => filtersPath(`${PATH}/download`, filters, { format })}
      columns={letterColumns}
      rows={letters}
      rowKey={(l) => l.id}
      empty={copy.none}
    />
  );
}
