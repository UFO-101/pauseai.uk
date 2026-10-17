import { found } from "@/lib/found";
import { getPolitician } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { politicianId } from "@/lib/staff-search";
import { editSigner } from "../../actions";
import PoliticianDetails from "../../_components/PoliticianDetails";
import StaffHeader from "../../_components/StaffHeader";
import StaffPage from "../../_components/ui/StaffPage";

export default async function PoliticianPage({ params }: { params: Promise<{ id: string }> }) {
  const { email } = await requireStaff();
  const politician = found(await getPolitician(found(politicianId((await params).id))));
  return (
    <StaffPage>
      <StaffHeader email={email} current="politicians" />
      <PoliticianDetails politician={politician} action={editSigner} />
    </StaffPage>
  );
}
