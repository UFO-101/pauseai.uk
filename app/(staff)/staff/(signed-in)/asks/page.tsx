import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { asksWithCounts } from "@/lib/server/asks";
import { requireStaff } from "@/lib/server/staff-auth";
import { askFormSearch, type ParamValue } from "@/lib/staff-search";
import AsksTable from "../../_components/AsksTable";
import PageTitle from "../../_components/ui/PageTitle";

export const metadata: Metadata = { title: staffCopy.asks.title };

export default async function AsksPage({ searchParams }: { searchParams: Promise<Record<string, ParamValue>> }) {
  await requireStaff();
  const { notice } = askFormSearch(await searchParams);
  const asks = await asksWithCounts();
  return (
    <>
      <PageTitle
        action={
          <ButtonLink variant="primary" fit href="/staff/asks/new">
            {staffCopy.asks.newTitle}
          </ButtonLink>
        }
      >
        {staffCopy.asks.title}
      </PageTitle>
      <p>{staffCopy.asks.intro}</p>
      <AsksTable asks={asks} notice={notice} />
    </>
  );
}
