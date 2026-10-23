import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listBlocks, recentProblems } from "@/lib/server/email";
import { requireStaff } from "@/lib/server/staff-auth";
import { emailsSearch } from "@/lib/staff-search";
import { unblockAddress } from "../../actions";
import EmailBlockFilters from "../../_components/EmailBlockFilters";
import EmailBlocksTable from "../../_components/EmailBlocksTable";
import EmailProblemsTable from "../../_components/EmailProblemsTable";
import StaffNav from "../../_components/StaffNav";
import StaffPage from "../../_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.emails.titles.mps };

/** Politicians' blocked addresses, and their bounces and complaints. The letters they name lead to them only with `supporters`. */
export default async function MpEmailsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { email, permissions } = await requireStaff();
  const { kind, filter } = emailsSearch(await searchParams);
  const [blocks, problems] = await Promise.all([listBlocks("politicians", filter), recentProblems("politicians")]);
  const letterLinks = permissions.includes("supporters");
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} current="mpEmails" />}>
      <h1>{staffCopy.emails.titles.mps}</h1>
      <p>{staffCopy.emails.intro}</p>
      <EmailBlockFilters kind={kind} action="/staff/politicians/blocked-emails" />
      <EmailBlocksTable blocks={blocks} unblock={unblockAddress} letterLinks={letterLinks} />
      <h2>{staffCopy.emails.problemsTitle}</h2>
      <EmailProblemsTable problems={problems} letterLinks={letterLinks} />
    </StaffPage>
  );
}
