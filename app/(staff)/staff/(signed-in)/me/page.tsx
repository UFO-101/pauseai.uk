import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { gmailAccount } from "@/lib/server/gmail-accounts";
import { listSessions, requireStaff } from "@/lib/server/staff-auth";
import { disconnectMyGmail } from "../../actions";
import MyGmail from "../../_components/MyGmail";
import StaffSessions from "../../_components/StaffSessions";

export const metadata: Metadata = { title: staffCopy.me.title };

/** Your own page, from your address in the navigation: your Gmail, then your sessions and the way to end them all. */
export default async function MePage() {
  const { email, token } = await requireStaff();
  const [account, sessions] = await Promise.all([gmailAccount(email), listSessions(email, token)]);
  return (
    <>
      <h1>{staffCopy.me.title}</h1>
      <p>{staffCopy.me.intro}</p>
      <MyGmail account={account} disconnect={disconnectMyGmail} />
      <h2 id="sessions">{staffCopy.me.sessionsTitle}</h2>
      <p>{staffCopy.sessions.intro}</p>
      <StaffSessions sessions={sessions} />
    </>
  );
}
