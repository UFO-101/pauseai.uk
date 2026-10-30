import { buttonClass } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { gmailUrl, type GmailFind } from "@/lib/letter-links";
import CopyButton from "./ui/CopyButton";
import Menu from "./ui/Menu";
import styles from "./FindInGmail.module.css";

const copy = staffCopy.findInGmail;

/** The button that copies the search, and where to paste it. */
function CopySearch({ search }: { search: string }) {
  return (
    <p className={styles.copy}>
      <CopyButton text={search} label={copy.copy} copied={copy.copied} /> <Muted>{copy.copyNote}</Muted>
    </p>
  );
}

/**
 * Find it in Gmail, a small button whose box gives two ways to a letter:
 * either 1) open it in the mailbox it's in, for someone signed in to that
 * account, saying which, or 2) copy
 * the search for it, which works pasted into any mailbox, a delegate's too
 * (lib/letter-links.ts). With the mailbox unknown, it says so, and there's
 * only the search. The search isn't shown, as an ID means nothing to
 * read. Nothing when there's nothing to
 * find. One a page.
 */
export default function FindInGmail({ find }: { find: GmailFind | null }) {
  if (!find) return null;
  const { mailbox } = find;
  return (
    <Menu
      id="find-in-gmail"
      trigger={buttonClass({ variant: "ghost", size: "small", fit: true, className: styles.trigger })}
      label={
        <>
          {copy.button}
          <span aria-hidden="true">▾</span>
        </>
      }
    >
      <div className={styles.box}>
        {mailbox ? (
          <>
            <p>{copy.either}</p>
            <ol className={styles.ways}>
              <li>
                <a href={gmailUrl(mailbox, find)} target="_blank" rel="noreferrer">
                  {copy.open}
                </a>{" "}
                <Muted>{copy.openNote(mailbox)}</Muted>
              </li>
              <li>
                <CopySearch search={find.search} />
              </li>
            </ol>
          </>
        ) : (
          <>
            <p>{copy.unknownMailbox}</p>
            <CopySearch search={find.search} />
          </>
        )}
      </div>
    </Menu>
  );
}
