import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { GmailAccount } from "@/lib/server/gmail-accounts";
import { staffDate } from "@/lib/staff-time";
import { GmailConnect, GmailOutcome, SentToday } from "./GmailConnect";
import styles from "./MyGmail.module.css";

const copy = staffCopy.gmail;

/** Whether threads with politicians are kept from your Gmail, and the button that changes it. */
function KeepThreads({ keeps, action }: { keeps: boolean; action: (form: FormData) => void | Promise<void> }) {
  const words = staffCopy.oneOff;
  return (
    <form action={action} aria-label={words.keepLabel}>
      <p>
        <strong>{keeps ? words.keepOn : words.keepOff}</strong> {words.keepHelp}
      </p>
      {!keeps && <input type="hidden" name="keep" value="on" />}
      <SubmitButton variant="ghost" size="small" fit>
        {keeps ? words.stopKeeping : words.startKeeping}
      </SubmitButton>
    </form>
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
  setKeepThreads,
}: {
  /** Who's logged in. */
  me: string;
  /** Whether that's the letters inbox. */
  lettersInbox?: boolean;
  account: GmailAccount | undefined;
  /** How connecting ended, if Google has just sent you back. */
  outcome: string;
  disconnect: (form: FormData) => void | Promise<void>;
  /** Whether threads with politicians are kept from it, and what changes that; for a connected account. */
  keepsThreads?: boolean;
  setKeepThreads?: (form: FormData) => void | Promise<void>;
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
            <p>
              {copy.connected(staffDate(account.connectedAt))}{" "}
              <SentToday sent={account.sentToday} lettersInbox={lettersInbox} />
            </p>
            {setKeepThreads && !lettersInbox && <KeepThreads keeps={keepsThreads} action={setKeepThreads} />}
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
