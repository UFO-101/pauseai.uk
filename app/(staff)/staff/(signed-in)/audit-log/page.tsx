import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { recentChanges } from "@/lib/server/audit";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { requireStaff } from "@/lib/server/staff-auth";
import { pageNumber } from "@/lib/staff-search";
import ChangesTable from "../../_components/ChangesTable";

export const metadata: Metadata = { title: staffCopy.changes.title };

export default async function ChangesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { permissions } = await requireStaff("admin");
  const supporters = permissions.includes("supporters");
  const page = pageNumber((await searchParams).page);
  const log = await recentChanges(supporters, page);
  return (
    <>
      <h1>{staffCopy.changes.title}</h1>
      <ChangesTable log={log} page={page} supporters={supporters} airtableTable={PARLIAMENTARIANS_TABLE_URL} />
    </>
  );
}
