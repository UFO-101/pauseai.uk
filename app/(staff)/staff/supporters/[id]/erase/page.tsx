import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { requireStaff } from "@/lib/server/staff-auth";
import { getSupporter } from "@/lib/server/supporters";
import { supporterId } from "@/lib/staff-search";
import { supporterTitle } from "@/lib/supporters";
import { eraseSupporterNow } from "../../../actions";
import EraseForm from "../../../_components/EraseForm";
import Breadcrumb from "../../../_components/Breadcrumb";
import StaffNav from "../../../_components/StaffNav";
import StaffPage from "../../../_components/ui/StaffPage";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff("supporters");
  const supporter = found(await getSupporter(found(supporterId((await params).id))));
  return { title: `${staffCopy.erase.title}: ${supporterTitle(supporter.summary)}` };
}

/** Erasing one supporter: a page of its own, so it's never done by accident. */
export default async function EraseSupporterPage({ params }: Params) {
  const { email, permissions } = await requireStaff("supporters");
  const supporter = found(await getSupporter(found(supporterId((await params).id))));
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} current="supporters" />}>
      <Breadcrumb href={`/staff/supporters/${supporter.summary.id}`}>{staffCopy.nav.supporters}</Breadcrumb>
      <EraseForm supporter={supporter.summary} action={eraseSupporterNow} />
    </StaffPage>
  );
}
