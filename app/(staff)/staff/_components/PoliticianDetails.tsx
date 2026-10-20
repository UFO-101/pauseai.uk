import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EmailBlock } from "@/lib/server/email";
import type { Politician } from "@/lib/server/politicians";
import { staffTime } from "@/lib/staff-time";
import PoliticianForm from "./PoliticianForm";
import UnblockForm from "./UnblockForm";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";

/**
 * A politician's page: their name, what's known of them, and the form to
 * edit them, for a signer the policy team added. Airtable's MPs are edited
 * there, and the test MPs not at all. If their address is blocked, why,
 * linked to the blocked emails page, and a way to unblock it.
 */
export default function PoliticianDetails({
  politician,
  action,
  block,
  unblock,
}: {
  politician: Politician;
  action: (form: FormData) => void | Promise<void>;
  block?: EmailBlock;
  unblock: (form: FormData) => void | Promise<void>;
}) {
  const editable = politician.airtableId === null && !politician.isTest;
  return (
    <>
      <h1>{politician.name}</h1>
      <p>
        <Muted>
          {[staffCopy.houses[politician.house], politician.constituency, politician.party, politician.email]
            .filter(Boolean)
            .join(" · ")}
        </Muted>
      </p>
      {block && (
        <>
          <p>
            <Tag tone="amber">{staffCopy.politicians.emailBlocked}</Tag>{" "}
            <Link href="/staff/blocked-emails">
              {staffCopy.politician.blocked(block.reason, staffTime(block.since))}
            </Link>
          </p>
          <UnblockForm block={block} action={unblock} />
        </>
      )}
      <h2>{staffCopy.politician.detailsTitle}</h2>
      {editable ? (
        <PoliticianForm action={action} politician={politician} />
      ) : (
        <p>{staffCopy.politician.fromAirtable}</p>
      )}
    </>
  );
}
