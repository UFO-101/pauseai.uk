import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";

/** Why an address bounced, in the server's words, marked if the bounce was found in someone's Gmail. */
export default function BounceReason({ reason, foundInGmail }: { reason: string; foundInGmail: boolean }) {
  return (
    <>
      {reason}
      {foundInGmail && (
        <>
          {" "}
          <Tag>{staffCopy.emails.foundInGmail}</Tag>
        </>
      )}
    </>
  );
}
