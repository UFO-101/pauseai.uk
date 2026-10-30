import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { GmailAccount } from "@/lib/server/gmail-accounts";
import { staffDate } from "@/lib/staff-time";
import { GmailConnect, GmailOutcome, SentToday } from "./GmailConnect";
import styles from "./MyGmail.module.css";

const copy = staffCopy.gmail;

/**
 * Your Gmail, on your own page, under a heading saying whether it's
 * connected: how connecting ended, if Google has just sent you back; then,
 * connected, since when and today's sends, with Disconnect; or what
 * connecting means, and the button.
 */
export default function MyGmail({
  me,
  account,
  outcome,
  disconnect,
}: {
  /** Who's logged in. */
  me: string;
  account: GmailAccount | undefined;
  /** How connecting ended, if Google has just sent you back. */
  outcome: string;
  disconnect: (form: FormData) => void | Promise<void>;
}) {
  return (
    <>
      <h2 id="gmail">{account ? copy.connectedTitle : copy.title}</h2>
      <div className={styles.body}>
        <GmailOutcome outcome={outcome} me={me} />
        {account ? (
          <>
            <p>
              {copy.connected(staffDate(account.connectedAt))} <SentToday sent={account.sentToday} />
            </p>
            <form action={disconnect}>
              <SubmitButton variant="ghost" size="small" fit>
                {copy.disconnect}
              </SubmitButton>
            </form>
          </>
        ) : (
          <GmailConnect back="/staff/me" />
        )}
      </div>
    </>
  );
}
