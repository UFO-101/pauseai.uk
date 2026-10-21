import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { logChange } from "@/lib/server/audit";
import { requireStaff } from "@/lib/server/staff-auth";
import { getSupporter } from "@/lib/server/supporters";
import { supporterId } from "@/lib/staff-search";
import { supporterTitle } from "@/lib/supporters";
import EraseLink from "../../_components/EraseLink";
import SupporterDetails from "../../_components/SupporterDetails";
import Breadcrumb from "../../_components/Breadcrumb";
import StaffNav from "../../_components/StaffNav";
import StaffPage from "../../_components/ui/StaffPage";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff("supporters");
  const supporter = found(await getSupporter(found(supporterId((await params).id))));
  return { title: supporterTitle(supporter.summary) };
}

/** One supporter: everything known of them, and what they did. Each viewing is in the audit log. */
export default async function SupporterPage({ params }: Params) {
  const { email, permissions } = await requireStaff("supporters");
  const supporter = found(await getSupporter(found(supporterId((await params).id))));
  await logChange(email, "view supporter", { id: supporter.summary.id });
  return (
    <StaffPage nav={<StaffNav email={email} account permissions={permissions} current="supporters" />}>
      <Breadcrumb href="/staff/supporters">{staffCopy.nav.supporters}</Breadcrumb>
      <SupporterDetails supporter={supporter} />
      <EraseLink supporterId={supporter.summary.id} />
    </StaffPage>
  );
}
