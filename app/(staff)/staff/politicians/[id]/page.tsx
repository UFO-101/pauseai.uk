import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { blockOn } from "@/lib/server/email";
import { politicianLetters } from "@/lib/server/letters";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { getPolitician, politicianHistory } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { politicianId } from "@/lib/staff-search";
import { editSigner, markSigned, unblockAddress } from "../../actions";
import PoliticianDetails from "../../_components/PoliticianDetails";
import Breadcrumb from "../../_components/Breadcrumb";
import StaffNav from "../../_components/StaffNav";
import StaffPage from "../../_components/ui/StaffPage";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff();
  const politician = found(await getPolitician(found(politicianId((await params).id))));
  return { title: politician.name };
}

export default async function PoliticianPage({ params }: Params) {
  const { email, permissions } = await requireStaff();
  const politician = found(await getPolitician(found(politicianId((await params).id))));
  const [block, letters, history] = await Promise.all([
    blockOn(politician.email),
    politicianLetters(politician.id, permissions),
    politicianHistory(politician.id, politician.email),
  ]);
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} current="politicians" />}>
      <Breadcrumb href="/staff/politicians">{staffCopy.nav.politicians}</Breadcrumb>
      <PoliticianDetails
        politician={politician}
        action={editSigner}
        markSigned={markSigned}
        block={block}
        unblock={unblockAddress}
        letters={letters}
        history={history}
        airtableTable={PARLIAMENTARIANS_TABLE_URL}
      />
    </StaffPage>
  );
}
