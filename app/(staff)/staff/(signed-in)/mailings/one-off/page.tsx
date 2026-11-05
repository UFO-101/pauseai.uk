import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listOneOffThreads } from "@/lib/server/one-off-emails";
import { requireStaff } from "@/lib/server/staff-auth";
import { oneOffSearch, type ParamValue } from "@/lib/staff-search";
import Breadcrumb from "../../../_components/Breadcrumb";
import OneOffList from "../../../_components/OneOffList";

export const metadata: Metadata = { title: staffCopy.oneOff.title };

/** Threads with politicians that aren't a mailing's or a campaign's, read-only. */
export default async function OneOffPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: ParamValue; page?: ParamValue }>;
}) {
  const { permissions } = await requireStaff();
  const { who, filter, page } = oneOffSearch(await searchParams);
  return (
    <>
      <Breadcrumb href="/staff/mailings">{staffCopy.nav.mailings}</Breadcrumb>
      <h1>{staffCopy.oneOff.title}</h1>
      <OneOffList {...await listOneOffThreads(permissions, { filter, page })} who={who} />
    </>
  );
}
