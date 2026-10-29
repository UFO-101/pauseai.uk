import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { gmailAccount } from "@/lib/server/gmail-accounts";
import { listSessions, requireStaff } from "@/lib/server/staff-auth";
import { firstOf, type ParamValue } from "@/lib/staff-search";
import { disconnectMyGmail } from "../../actions";
import AccountTitle from "../../_components/AccountTitle";
import MyGmail from "../../_components/MyGmail";
import StaffSessions from "../../_components/StaffSessions";

export const metadata: Metadata = { title: staffCopy.me.title };

/** Your own page, from your address in the navigation: your address, your sessions and the way to end them all, then your Gmail. */
export default async function MePage({ searchParams }: { searchParams: Promise<Record<string, ParamValue>> }) {
  const { email, token } = await requireStaff();
  const [account, sessions] = await Promise.all([gmailAccount(email), listSessions(email, token)]);
  return (
    <>
      <AccountTitle email={email} />
      <h2 id="sessions">{staffCopy.me.sessionsTitle}</h2>
      <p>{staffCopy.sessions.intro}</p>
      <StaffSessions sessions={sessions} />
      <MyGmail account={account} outcome={firstOf((await searchParams).gmail)} disconnect={disconnectMyGmail} />
    </>
  );
}
