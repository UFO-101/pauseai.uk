import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listBlocks, recentProblems } from "@/lib/server/email";
import { requireStaff } from "@/lib/server/staff-auth";
import { emailsSearch, filtersPath } from "@/lib/staff-search";
import { unblockAddress } from "../../../actions";
import EmailBlockFilters from "../../../_components/EmailBlockFilters";
import EmailBlocksTable from "../../../_components/EmailBlocksTable";
import EmailProblemsTable from "../../../_components/EmailProblemsTable";

export const metadata: Metadata = { title: staffCopy.emails.titles.mps };

/** Politicians' blocked addresses, and their bounces and complaints. The letters they name lead to them only with `supporters`. */
export default async function MpEmailsPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const { permissions } = await requireStaff();
  const { q, kind, filter } = emailsSearch(await searchParams);
  const [blocks, problems] = await Promise.all([listBlocks("politicians", filter), recentProblems("politicians")]);
  const letterLinks = permissions.includes("supporters");
  return (
    <>
      <h1>{staffCopy.emails.titles.mps}</h1>
      <p>{staffCopy.emails.intro}</p>
      <EmailBlockFilters q={q} kind={kind} action="/staff/politicians/blocked-emails" />
      <EmailBlocksTable
        blocks={blocks}
        unblock={unblockAddress}
        letterLinks={letterLinks}
        download={(format) => filtersPath("/staff/politicians/blocked-emails/download", { q, kind, format })}
      />
      <h2>{staffCopy.emails.problemsTitle}</h2>
      <EmailProblemsTable problems={problems} letterLinks={letterLinks} />
    </>
  );
}
