import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { GmailFind } from "@/lib/letter-links";
import CopyButton from "./ui/CopyButton";
import styles from "./FindInGmail.module.css";

const copy = staffCopy.findInGmail;

/**
 * Copy Gmail search, a button that copies the search for a letter in
 * Gmail, then says Copied!, and in a bubble to paste it into Gmail search,
 * and under that, lighter, where: an inbox that can see the mailbox it's
 * in, or the mail of the one it was sent from when we don't know. The
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
            <span className={styles.line}>{find.mailbox ? copy.where(find.mailbox) : copy.whereUnknown}</span>
          </Muted>
        </>
      }
    />
  );
}
