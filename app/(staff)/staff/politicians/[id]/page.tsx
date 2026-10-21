import { found } from "@/lib/found";
import { blockOn } from "@/lib/server/email";
import { getPolitician } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { politicianId } from "@/lib/staff-search";
import { editSigner, unblockAddress } from "../../actions";
import PoliticianDetails from "../../_components/PoliticianDetails";
import StaffNav from "../../_components/StaffNav";
import StaffPage from "../../_components/ui/StaffPage";

export default async function PoliticianPage({ params }: { params: Promise<{ id: string }> }) {
  const { email, permissions } = await requireStaff();
  const politician = found(await getPolitician(found(politicianId((await params).id))));
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} current="politicians" />}>
      <PoliticianDetails
        politician={politician}
        action={editSigner}
        block={await blockOn(politician.email)}
        unblock={unblockAddress}
      />
    </StaffPage>
  );
}
