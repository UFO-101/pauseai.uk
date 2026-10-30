import { buttonClass } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { gmailUrl, type GmailFind } from "@/lib/letter-links";
import CopyButton from "./ui/CopyButton";
import Menu from "./ui/Menu";
import styles from "./FindInGmail.module.css";

const copy = staffCopy.findInGmail;

/**
 * Find it in Gmail, a small button whose box says which mailbox a letter
 * is in, opens it there for someone signed in to that account, and gives
 * the search for it to copy, which works pasted into any mailbox, a
 * delegate's too (lib/letter-links.ts). Nothing when there's nothing to
 * find. One a page.
 */
export default function FindInGmail({ find }: { find: GmailFind | null }) {
  if (!find) return null;
  const { mailbox } = find;
  return (
    <Menu
      id="find-in-gmail"
      trigger={buttonClass({ variant: "ghost", size: "small", fit: true, className: styles.trigger })}
      label={copy.button}
    >
      <div className={styles.box}>
        <p>{mailbox ? copy.mailbox(mailbox) : copy.unknownMailbox}</p>
        {mailbox && (
          <p>
            <a href={gmailUrl(mailbox, find)} target="_blank" rel="noreferrer">
              {copy.open}
            </a>{" "}
            <Muted>{copy.openNote(mailbox)}</Muted>
          </p>
        )}
        <code className={styles.search}>{find.search}</code>
        <p className={styles.copy}>
          <CopyButton text={find.search} label={copy.copy} copied={copy.copied} /> <Muted>{copy.copyNote}</Muted>
        </p>
      </div>
    </Menu>
  );
}
