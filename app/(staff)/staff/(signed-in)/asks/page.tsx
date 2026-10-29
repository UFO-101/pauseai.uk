import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { asksWithCounts } from "@/lib/server/asks";
import { requireStaff } from "@/lib/server/staff-auth";
import { askFormSearch, type ParamValue } from "@/lib/staff-search";
import AsksTable from "../../_components/AsksTable";

export const metadata: Metadata = { title: staffCopy.asks.title };

export default async function AsksPage({ searchParams }: { searchParams: Promise<Record<string, ParamValue>> }) {
  await requireStaff();
  const { notice } = askFormSearch(await searchParams);
  const asks = await asksWithCounts();
  return (
    <>
      <h1>{staffCopy.asks.title}</h1>
      <p>{staffCopy.asks.intro}</p>
      <AsksTable asks={asks} notice={notice} />
    </>
  );
}
