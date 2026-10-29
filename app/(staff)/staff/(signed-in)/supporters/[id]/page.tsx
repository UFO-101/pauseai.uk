import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { requireStaff } from "@/lib/server/staff-auth";
import { getSupporter } from "@/lib/server/supporters";
import { supporterId } from "@/lib/staff-search";
import { canonicalSupporter, supporterTitle } from "@/lib/supporters";
import EraseLink from "../../../_components/EraseLink";
import SupporterDetails from "../../../_components/SupporterDetails";
import Breadcrumb from "../../../_components/Breadcrumb";

type Params = { params: Promise<{ id: string }> };

/** The supporter with the ID in the URL; a redirect to their own page when it was merged into theirs; or a 404. */
async function supporterOf(params: Params["params"]) {
  const id = found(supporterId((await params).id));
  return canonicalSupporter(id, found(await getSupporter(id)));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff("supporters");
  const supporter = await supporterOf(params);
  return { title: supporterTitle(supporter.summary) };
}

/** One supporter: everything known of them, and what they did. */
export default async function SupporterPage({ params }: Params) {
  await requireStaff("supporters");
  const supporter = await supporterOf(params);
  return (
    <>
      <Breadcrumb href="/staff/supporters">{staffCopy.nav.supporters}</Breadcrumb>
      <SupporterDetails supporter={supporter} erase={<EraseLink supporterId={supporter.summary.id} />} />
    </>
  );
}
