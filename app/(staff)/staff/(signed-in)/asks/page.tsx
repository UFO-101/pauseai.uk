import type { Metadata } from "next";
import { buttonClass } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { asksWithCounts } from "@/lib/server/asks";
import { requireStaff } from "@/lib/server/staff-auth";
import { askFormSearch, type ParamValue } from "@/lib/staff-search";
import AsksTable from "../../_components/AsksTable";
import PageTitle from "../../_components/ui/PageTitle";
import StaffLink from "../../_components/ui/StaffLink";

export const metadata: Metadata = { title: staffCopy.asks.title };

export default async function AsksPage({ searchParams }: { searchParams: Promise<Record<string, ParamValue>> }) {
  await requireStaff();
  const { notice } = askFormSearch(await searchParams);
  const asks = await asksWithCounts();
  return (
    <>
      <PageTitle
        action={
          <StaffLink className={buttonClass({ variant: "primary", fit: true })} href="/staff/asks/new">
            {staffCopy.asks.newTitle}
          </StaffLink>
        }
      >
        {staffCopy.asks.title}
      </PageTitle>
      <p>{staffCopy.asks.intro}</p>
      <AsksTable asks={asks} notice={notice} />
    </>
  );
}
