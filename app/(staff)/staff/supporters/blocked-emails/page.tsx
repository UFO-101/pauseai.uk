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

export const metadata: Metadata = { title: staffCopy.emails.titles.supporters };

/** Every blocked address but politicians', staff's and unknown ones included, and their bounces and complaints. */
export default async function SupporterEmailsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { email, permissions } = await requireStaff("supporters");
  const { kind, filter } = emailsSearch(await searchParams);
  const [blocks, problems] = await Promise.all([listBlocks("others", filter), recentProblems("others")]);
  return (
    <StaffPage nav={<StaffNav email={email} account permissions={permissions} current="supporterEmails" />}>
      <h1>{staffCopy.emails.titles.supporters}</h1>
      <p>{staffCopy.emails.intro}</p>
      <EmailBlockFilters kind={kind} action="/staff/supporters/blocked-emails" />
      <EmailBlocksTable blocks={blocks} unblock={unblockAddress} letterLinks />
      <h2>{staffCopy.emails.problemsTitle}</h2>
      <EmailProblemsTable problems={problems} letterLinks />
    </StaffPage>
  );
}
