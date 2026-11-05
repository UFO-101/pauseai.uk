import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listSentEmails } from "@/lib/server/sent-emails";
import { requireStaff } from "@/lib/server/staff-auth";
import { sentEmailsSearch, type ParamValue, type SentEmailsSearch } from "@/lib/staff-search";
import SentEmails from "../../_components/SentEmails";

export const metadata: Metadata = { title: staffCopy.nav.sentEmails };

/** Everything in the send log, newest first, with just a search and filters over the table. */
export default async function SentEmailsPage({
  searchParams,
}: {
  searchParams: Promise<Partial<Record<keyof SentEmailsSearch, ParamValue>>>;
}) {
  const { permissions } = await requireStaff("admin");
  const { filter, ...search } = sentEmailsSearch(await searchParams);
  const supporters = permissions.includes("supporters");
  return <SentEmails {...await listSentEmails(filter, supporters)} search={search} supporters={supporters} />;
}
