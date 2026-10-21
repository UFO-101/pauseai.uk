import { found } from "@/lib/found";
import { logChange } from "@/lib/server/audit";
import { requireStaff } from "@/lib/server/staff-auth";
import { getSupporter } from "@/lib/server/supporters";
import { supporterId } from "@/lib/staff-search";
import { eraseSupporterNow } from "../../actions";
import EraseForm from "../../_components/EraseForm";
import SupporterDetails from "../../_components/SupporterDetails";
import StaffNav from "../../_components/StaffNav";
import StaffPage from "../../_components/ui/StaffPage";

/** One supporter: everything known of them, and what they did. Each viewing is in the audit log. */
export default async function SupporterPage({ params }: { params: Promise<{ id: string }> }) {
  const { email, permissions } = await requireStaff("supporters");
  const supporter = found(await getSupporter(found(supporterId((await params).id))));
  await logChange(email, "view supporter", { id: supporter.summary.id });
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} current="supporters" />}>
      <SupporterDetails supporter={supporter} />
      <EraseForm supporterId={supporter.summary.id} action={eraseSupporterNow} />
    </StaffPage>
  );
}
