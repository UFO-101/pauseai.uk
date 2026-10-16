import { notFound } from "next/navigation";
import { staffCopy } from "@/lib/content/staff-interface";
import { getPolitician } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { editSigner } from "../../actions";
import PoliticianForm from "../../_components/PoliticianForm";
import StaffHeader from "../../_components/StaffHeader";
import Muted from "../../_components/ui/Muted";
import StaffPage from "../../_components/ui/StaffPage";

export default async function PoliticianPage({ params }: { params: Promise<{ id: string }> }) {
  const { email } = await requireStaff();
  const { id } = await params;
  const politician = /^\d+$/.test(id) ? await getPolitician(Number(id)) : undefined;
  if (!politician) notFound();
  const editable = politician.airtableId === null && !politician.isTest;
  return (
    <StaffPage>
      <StaffHeader email={email} current="politicians" />
      <h1>{politician.name}</h1>
      <p>
        <Muted>
          {[staffCopy.houses[politician.house], politician.constituency, politician.party, politician.email]
            .filter(Boolean)
            .join(" · ")}
        </Muted>
      </p>
      <h2>{staffCopy.politician.detailsTitle}</h2>
      {editable ? (
        <PoliticianForm action={editSigner} politician={politician} />
      ) : (
        <p>{staffCopy.politician.fromAirtable}</p>
      )}
    </StaffPage>
  );
}
