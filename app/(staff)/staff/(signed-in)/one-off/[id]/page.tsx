import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { getOneOffThread } from "@/lib/server/one-off-emails";
import { requireStaff } from "@/lib/server/staff-auth";
import { letterId } from "@/lib/staff-search";
import Breadcrumb from "../../../_components/Breadcrumb";
import OneOffThreadView from "../../../_components/OneOffThreadView";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: staffCopy.oneOff.title };

/** One thread with a politician: every message, oldest first. */
export default async function OneOffThreadPage({ params }: Params) {
  const { permissions } = await requireStaff();
  const thread = found(await getOneOffThread(found(letterId((await params).id)), permissions));
  return (
    <>
      <Breadcrumb href="/staff/emails">{staffCopy.nav.emails}</Breadcrumb>
      <OneOffThreadView thread={thread} />
    </>
  );
}
