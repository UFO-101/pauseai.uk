import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { GmailAccount } from "@/lib/server/gmail-accounts";
import { staffDate } from "@/lib/staff-time";
import { GmailConnect, GmailOutcome, SentToday } from "./GmailConnect";
import styles from "./MyGmail.module.css";
import StaffLink from "./ui/StaffLink";

const copy = staffCopy.gmail;

/** What's kept from this mailbox: all its threads with politicians, or only replies to what's sent from here. */
function KeptNote({ keeps }: { keeps: boolean }) {
  const words = staffCopy.oneOff;
  const { before, after } = keeps ? words.kept : words.notKept;
  return (
    <p>
      <em>
        {before}{" "}
        {keeps ? (
          <StaffLink href="/staff/one-off">{words.title}</StaffLink>
        ) : (
          <StaffLink href="/staff/mailings">{staffCopy.mailings.title}</StaffLink>
        )}
        {after}
      </em>
    </p>
  );
}

/**
 * Your Gmail, on your own page, under a heading saying whether it's
 * connected, and for the letters inbox, that it sends supporters' letters: how connecting ended, if Google has just sent you back; then,
 * connected, since when and today's sends, whether threads with politicians
 * are kept from it, with Disconnect; or what
 * connecting means, and the button.
 */
export default function MyGmail({
  me,
  lettersInbox = false,
  account,
  outcome,
  disconnect,
  keepsThreads = false,
}: {
  /** Who's logged in. */
  me: string;
  /** Whether that's the letters inbox. */
  lettersInbox?: boolean;
  account: GmailAccount | undefined;
  /** How connecting ended, if Google has just sent you back. */
  outcome: string;
  disconnect: (form: FormData) => void | Promise<void>;
  /** Whether threads with politicians are kept from it. */
  keepsThreads?: boolean;
}) {
  return (
    <>
      <h2 id="gmail">
        {lettersInbox
          ? account
            ? copy.lettersInboxConnectedTitle
            : copy.lettersInboxTitle
          : account
            ? copy.connectedTitle
            : copy.title}
      </h2>
      <div className={styles.body}>
        <GmailOutcome outcome={outcome} me={me} lettersInbox={lettersInbox} />
        {account ? (
          <>
            {!lettersInbox && <KeptNote keeps={keepsThreads} />}
            <p>
              {copy.connected(staffDate(account.connectedAt))}{" "}
              <SentToday sent={account.sentToday} lettersInbox={lettersInbox} />
            </p>
            <form action={disconnect}>
              <SubmitButton variant="ghost" size="small" fit>
                {copy.disconnect}
              </SubmitButton>
            </form>
          </>
        ) : (
          <GmailConnect back="/staff/me" lettersInbox={lettersInbox} />
        )}
      </div>
    </>
  );
}
