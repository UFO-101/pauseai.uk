import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { requireStaff } from "@/lib/server/staff-auth";
import { getSupporter } from "@/lib/server/supporters";
import { supporterId } from "@/lib/staff-search";
import { eraseSupporterNow } from "../../../actions";
import EraseForm from "../../../_components/EraseForm";
import Breadcrumb from "../../../_components/Breadcrumb";
import StaffNav from "../../../_components/StaffNav";
import StaffPage from "../../../_components/ui/StaffPage";

/** Erasing one supporter: a page of its own, so it's never done by accident. */
export default async function EraseSupporterPage({ params }: { params: Promise<{ id: string }> }) {
  const { email, permissions } = await requireStaff("supporters");
  const supporter = found(await getSupporter(found(supporterId((await params).id))));
  return (
    <StaffPage nav={<StaffNav email={email} account permissions={permissions} current="supporters" />}>
      <Breadcrumb href={`/staff/supporters/${supporter.summary.id}`}>{staffCopy.nav.supporters}</Breadcrumb>
      <EraseForm supporter={supporter.summary} action={eraseSupporterNow} />
    </StaffPage>
  );
}
