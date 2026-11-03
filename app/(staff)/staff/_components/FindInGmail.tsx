import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { GmailFind } from "@/lib/letter-links";
import CopyButton from "./ui/CopyButton";
import styles from "./FindInGmail.module.css";

const copy = staffCopy.findInGmail;

/** Where the search finds it: policy@'s members' mail, the mailbox it's in, or, when that isn't known, the one it went from. */
function whereFor(find: GmailFind): string {
  if (find.inPolicyGroup) return copy.policyGroup;
  return find.mailbox ? copy.where(find.mailbox) : copy.whereUnknown;
}

/**
 * Copy Gmail search, a button that copies the search for a letter in
 * Gmail, then says Copied!, and in a Notice under it to paste it into Gmail
 * search, and under that, lighter, where (whereFor). The
 * search works in any mailbox, a delegate's too (lib/letter-links.ts). It
 * isn't shown, as an ID means nothing to read. Nothing when there's nothing
 * to find.
 */
export default function FindInGmail({ find }: { find: GmailFind | null }) {
  if (!find) return null;
  return (
    <CopyButton
      text={find.search}
      label={copy.copy}
      copied={copy.copied}
      close={copy.close}
      note={
        <>
          <strong className={styles.line}>
            {copy.next.before}
            <em>{copy.next.stressed}</em>
            {copy.next.after}
          </strong>
          <Muted>
            <span className={styles.line}>{whereFor(find)}</span>
          </Muted>
        </>
      }
    />
  );
}
