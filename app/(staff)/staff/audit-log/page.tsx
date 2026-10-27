import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { recentChanges } from "@/lib/server/audit";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { requireStaff } from "@/lib/server/staff-auth";
import { pageNumber } from "@/lib/staff-search";
import ChangesTable from "../_components/ChangesTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.changes.title };

export default async function ChangesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { email, permissions, sessions } = await requireStaff("admin");
  const page = pageNumber((await searchParams).page);
  const log = await recentChanges(page);
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="changes" />}>
      <h1>{staffCopy.changes.title}</h1>
      <ChangesTable log={log} page={page} airtableTable={PARLIAMENTARIANS_TABLE_URL} />
    </StaffPage>
  );
}
