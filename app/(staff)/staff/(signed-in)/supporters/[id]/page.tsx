import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { requireStaff } from "@/lib/server/staff-auth";
import { getSupporter } from "@/lib/server/supporters";
import { supporterId } from "@/lib/staff-search";
import { supporterTitle } from "@/lib/supporters";
import EraseLink from "../../../_components/EraseLink";
import SupporterDetails from "../../../_components/SupporterDetails";
import Breadcrumb from "../../../_components/Breadcrumb";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff("supporters");
  const supporter = found(await getSupporter(found(supporterId((await params).id))));
  return { title: supporterTitle(supporter.summary) };
}

/** One supporter: everything known of them, and what they did. */
export default async function SupporterPage({ params }: Params) {
  await requireStaff("supporters");
  const supporter = found(await getSupporter(found(supporterId((await params).id))));
  return (
    <>
      <Breadcrumb href="/staff/supporters">{staffCopy.nav.supporters}</Breadcrumb>
      <SupporterDetails supporter={supporter} erase={<EraseLink supporterId={supporter.summary.id} />} />
    </>
  );
}
