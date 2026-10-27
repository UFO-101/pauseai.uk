import Link from "next/link";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EmailBlock } from "@/lib/server/email";
import type { DownloadFormat } from "@/lib/staff-list";
import { staffTime } from "@/lib/staff-time";
import LetterLink from "./LetterLink";
import UnblockForm from "./UnblockForm";
import ListFrame, { type ListColumn } from "./ui/ListFrame";

const copy = staffCopy.emails;

/** What the email that found an address out was, in words: a letter, by whom it was to, or what the site sent. */
function sentWords(block: EmailBlock): string | null {
  if (block.letter) return `${copy.letterTo} ${block.letter.to}`;
  return block.purpose ? copy.purposes[block.purpose] : null;
}

/**
 * The blocked addresses' columns: the address, why, since when, whose,
 * the email that found it out (a letter linked with `letterLinks`), how
 * many emails haven't been sent since; and with `unblock`, a way to
 * unblock each, which a download leaves out.
 */
export function blockColumns(
  letterLinks: boolean,
  unblock?: (form: FormData) => void | Promise<void>,
): ListColumn<EmailBlock>[] {
  const columns: ListColumn<EmailBlock>[] = [
    { key: "address", label: copy.columns.address, text: (b) => b.address, cell: (b) => b.address },
    {
      key: "kind",
      label: copy.columns.kind,
      short: true,
      text: (b) => copy.kinds[b.kind],
      cell: (b) => copy.kinds[b.kind],
    },
    { key: "since", label: copy.columns.since, short: true, text: (b) => b.since, cell: (b) => staffTime(b.since) },
    { key: "reason", label: copy.columns.reason, text: (b) => b.reason, cell: (b) => b.reason },
    {
      key: "whose",
      label: copy.columns.whose,
      text: (b) => b.politicians.map((p) => p.name).join("; "),
      cell: (b) =>
        b.politicians.map((p, i) => (
          <span key={p.id}>
            {i > 0 && ", "}
            <Link href={`/staff/politicians/${p.id}`}>{p.name}</Link>
          </span>
        )),
    },
    {
      key: "sent",
      label: copy.columns.sent,
      text: sentWords,
      cell: (b) =>
        b.letter ? (
          <LetterLink letter={b.letter} linked={letterLinks} />
        ) : (
          (sentWords(b) ?? <Muted>{copy.notRecorded}</Muted>)
        ),
    },
    { key: "refused", label: copy.columns.refused, short: true, text: (b) => b.refused, cell: (b) => b.refused },
  ];
  return unblock
    ? [...columns, { key: "unblock", label: "", cell: (b) => <UnblockForm block={b} action={unblock} /> }]
    : columns;
}

/**
 * The blocked addresses, in the list frame: how many, their downloads at
 * `download`, and a row each; or that there are none.
 */
export default function EmailBlocksTable({
  blocks,
  unblock,
  letterLinks,
  download,
}: {
  blocks: EmailBlock[];
  unblock: (form: FormData) => void | Promise<void>;
  letterLinks: boolean;
  download?: (format: DownloadFormat) => string;
}) {
  return (
    <ListFrame
      count={copy.count(blocks.length)}
      total={blocks.length}
      page={1}
      pages={1}
      pageSize={blocks.length}
      download={download}
      columns={blockColumns(letterLinks, unblock)}
      rows={blocks}
      rowKey={(b) => b.address}
      empty={copy.noBlocks}
    />
  );
}
