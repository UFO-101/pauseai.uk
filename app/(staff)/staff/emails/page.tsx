import { staffCopy } from "@/lib/content/staff-interface";
import { listBlocks, recentProblems } from "@/lib/server/email";
import { requireStaff } from "@/lib/server/staff-auth";
import { emailsSearch } from "@/lib/staff-search";
import { unblockAddress } from "../actions";
import EmailBlockFilters from "../_components/EmailBlockFilters";
import EmailBlocksTable from "../_components/EmailBlocksTable";
import EmailProblemsTable from "../_components/EmailProblemsTable";
import StaffHeader from "../_components/StaffHeader";
import StaffPage from "../_components/ui/StaffPage";

export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { email } = await requireStaff();
  const { kind, filter } = emailsSearch(await searchParams);
  const [blocks, problems] = await Promise.all([listBlocks(filter), recentProblems()]);
  return (
    <StaffPage>
      <StaffHeader email={email} current="emails" />
      <h1>{staffCopy.emails.title}</h1>
      <p>{staffCopy.emails.intro}</p>
      <EmailBlockFilters kind={kind} />
      <EmailBlocksTable blocks={blocks} unblock={unblockAddress} />
      <h2>{staffCopy.emails.problemsTitle}</h2>
      <EmailProblemsTable problems={problems} />
    </StaffPage>
  );
}
