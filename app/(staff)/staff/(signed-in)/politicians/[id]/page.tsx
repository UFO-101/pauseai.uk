import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { listAsks } from "@/lib/server/asks";
import { blockOn } from "@/lib/server/email";
import { pauseaiLetters, politicianLetters } from "@/lib/server/letters";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { notesOn } from "@/lib/server/notes";
import { canDeletePolitician, getPolitician, politicianHistory } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { now } from "@/lib/now";
import { politicianId } from "@/lib/staff-search";
import {
  addNoteNow,
  deleteNoteNow,
  deletePoliticianNow,
  editNoteNow,
  setAskStatus,
  unblockAddress,
} from "../../../actions";
import DeletePolitician from "../../../_components/DeletePolitician";
import PoliticianDetails from "../../../_components/PoliticianDetails";
import Breadcrumb from "../../../_components/Breadcrumb";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff();
  const politician = found(await getPolitician(found(politicianId((await params).id))));
  return { title: politician.name };
}

export default async function PoliticianPage({ params }: Params) {
  const staff = await requireStaff();
  const { permissions } = staff;
  const politician = found(await getPolitician(found(politicianId((await params).id))));
  const [asks, block, letters, fromPauseai, history, deletable, notes] = await Promise.all([
    listAsks(),
    blockOn(politician.email),
    politicianLetters(politician.id, permissions),
    pauseaiLetters(politician.id),
    politicianHistory(politician.id, politician.email),
    canDeletePolitician(politician.id),
    notesOn({ politicianId: politician.id }),
  ]);
  return (
    <>
      <Breadcrumb href="/staff/politicians">{staffCopy.nav.politicians}</Breadcrumb>
      <PoliticianDetails
        politician={politician}
        asks={asks}
        setStatus={setAskStatus}
        block={block}
        unblock={unblockAddress}
        letters={letters}
        pauseaiLetters={fromPauseai}
        history={history}
        airtableTable={PARLIAMENTARIANS_TABLE_URL}
        notes={{
          notes,
          reader: staff,
          at: now().toISOString(),
          add: addNoteNow,
          edit: editNoteNow,
          remove: deleteNoteNow,
        }}
      />
      <DeletePolitician politician={politician} deletable={deletable} action={deletePoliticianNow} />
    </>
  );
}
