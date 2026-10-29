import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import type { GmailAccount } from "@/lib/server/gmail-accounts";
import { staffDate } from "@/lib/staff-time";
import { GmailConnect, GmailOutcome, SentToday } from "./GmailConnect";
import Grid, { Card } from "./ui/Grid";

const copy = staffCopy.gmail;

/**
 * Your Gmail, on your own page: how connecting ended, if Google has just
 * sent you back; then, connected, since when and today's sends, with
 * Disconnect; or what connecting means, and the button to.
 */
export default function MyGmail({
  account,
  disconnect,
}: {
  account: GmailAccount | undefined;
  disconnect: (form: FormData) => void | Promise<void>;
}) {
  return (
    <Grid>
      <Card span={6} title={copy.title} id="gmail-title">
        <GmailOutcome />
        {account ? (
          <>
            <p>
              {copy.connected(staffDate(account.connectedAt))} <SentToday sent={account.sentToday} />
            </p>
            <form action={disconnect}>
              <Button type="submit" variant="ghost" fit>
                {copy.disconnect}
              </Button>
            </form>
          </>
        ) : (
          <GmailConnect back="/staff/me" />
        )}
      </Card>
    </Grid>
  );
}
