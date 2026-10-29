import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./BounceReason.module.css";

/**
 * Why an address bounced, in the server's words, marked if the bounce was
 * found in someone's Gmail; never squeezed narrower than a few words, so on
 * a phone its table scrolls sideways instead.
 */
export default function BounceReason({ reason, foundInGmail }: { reason: string; foundInGmail: boolean }) {
  return (
    <span className={styles.reason}>
      {reason}
      {foundInGmail && (
        <>
          {" "}
          <Tag>{staffCopy.emails.foundInGmail}</Tag>
        </>
      )}
    </span>
  );
}
