import Link from "next/link";
import Table from "@/components/ui/Table";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EmailBlock } from "@/lib/server/email";
import { staffTime } from "@/lib/staff-time";
import LetterLink from "./LetterLink";
import UnblockForm from "./UnblockForm";

/**
 * The blocked addresses: why, since when, whose, the email that found it
 * out (a letter linked with `letterLinks`), how many emails haven't been sent
 * since, and a way to unblock each.
 */
export default function EmailBlocksTable({
  blocks,
  unblock,
  letterLinks,
}: {
  blocks: EmailBlock[];
  unblock: (form: FormData) => void | Promise<void>;
  letterLinks: boolean;
}) {
  if (blocks.length === 0) return <p>{staffCopy.emails.noBlocks}</p>;
  const columns = staffCopy.emails.columns;
  return (
    <Table>
      <thead>
        <tr>
          <th>{columns.address}</th>
          <th>{columns.kind}</th>
          <th>{columns.since}</th>
          <th>{columns.reason}</th>
          <th>{columns.whose}</th>
          <th>{columns.sent}</th>
          <th>{columns.refused}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {blocks.map((block) => (
          <tr key={block.address}>
            <td>{block.address}</td>
            <td>{staffCopy.emails.kinds[block.kind]}</td>
            <td>{staffTime(block.since)}</td>
            <td>{block.reason}</td>
            <td>
              {block.politicians.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ", "}
                  <Link href={`/staff/politicians/${p.id}`}>{p.name}</Link>
                </span>
              ))}
            </td>
            <td>
              {block.letter ? (
                <LetterLink letter={block.letter} linked={letterLinks} />
              ) : block.purpose ? (
                staffCopy.emails.purposes[block.purpose]
              ) : (
                <Muted>{staffCopy.emails.notRecorded}</Muted>
              )}
            </td>
            <td>{block.refused}</td>
            <td>
              <UnblockForm block={block} action={unblock} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
