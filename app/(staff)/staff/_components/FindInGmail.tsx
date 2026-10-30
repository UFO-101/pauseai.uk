import { staffCopy } from "@/lib/content/staff-interface";
import type { GmailFind } from "@/lib/letter-links";
import CopyButton from "./ui/CopyButton";

const copy = staffCopy.findInGmail;

/**
 * Copy Gmail search, a button that copies the search for a letter in
 * Gmail, then says Copied!, and in a bubble where to paste it: in a Gmail that can see
 * the mailbox it's in, or the one it was sent from when we don't know. The
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
      note={find.mailbox ? copy.where(find.mailbox) : copy.whereUnknown}
    />
  );
}
