import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listOneOffThreads, oneOffInbox } from "@/lib/server/one-off-emails";
import { requireStaff } from "@/lib/server/staff-auth";
import { pageNumber } from "@/lib/staff-search";
import OneOffList from "../../_components/OneOffList";
import PageIntro from "../../_components/ui/PageIntro";

export const metadata: Metadata = { title: staffCopy.oneOff.title };

/** Threads with politicians that aren't a mailing's or a campaign's, read-only. */
export default async function OneOffPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { permissions } = await requireStaff();
  const page = pageNumber((await searchParams).page);
  return (
    <>
      <h1>{staffCopy.oneOff.title}</h1>
      <PageIntro>{staffCopy.oneOff.intro(oneOffInbox())}</PageIntro>
      <OneOffList {...await listOneOffThreads(permissions, page)} />
    </>
  );
}
