import { staffCopy } from "@/lib/content/staff-interface";
import type { Politician } from "@/lib/server/politicians";
import PoliticianForm from "./PoliticianForm";
import { Muted } from "@/components/ui/Text";

/**
 * A politician's page: their name, what's known of them, and the form to
 * edit them, for a signer the policy team added. Airtable's MPs are edited
 * there, and the test MPs not at all.
 */
export default function PoliticianDetails({
  politician,
  action,
}: {
  politician: Politician;
  action: (form: FormData) => void | Promise<void>;
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
      <h2>{staffCopy.politician.detailsTitle}</h2>
      {editable ? (
        <PoliticianForm action={action} politician={politician} />
      ) : (
        <p>{staffCopy.politician.fromAirtable}</p>
      )}
    </>
  );
}
