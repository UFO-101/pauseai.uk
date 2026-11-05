import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { now } from "@/lib/now";
import { notesOn } from "@/lib/server/notes";
import { requireStaff } from "@/lib/server/staff-auth";
import { getSupporter } from "@/lib/server/supporters";
import { supporterId } from "@/lib/staff-search";
import { canonicalSupporter, supporterTitle } from "@/lib/supporters";
import { addNoteNow, deleteNoteNow, editNoteNow } from "../../../actions";
import EraseLink from "../../../_components/EraseLink";
import Notes from "../../../_components/Notes";
import SupporterDetails from "../../../_components/SupporterDetails";
import { supporterOneOffs } from "@/lib/server/one-off-emails";
import { OneOffTable } from "../../../_components/OneOffList";
import Breadcrumb from "../../../_components/Breadcrumb";

type Params = { params: Promise<{ id: string }> };

/** The supporter with the ID in the URL; a redirect to their own page when it was merged into theirs; or a 404. */
async function supporterOf(params: Params["params"]) {
  const id = found(supporterId((await params).id));
  return canonicalSupporter(id, found(await getSupporter(id)));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff("supporters");
  const supporter = await supporterOf(params);
  return { title: supporterTitle(supporter.summary) };
}

/** One supporter: everything known of them, and what they did. */
export default async function SupporterPage({ params }: Params) {
  const staff = await requireStaff("supporters");
  const supporter = await supporterOf(params);
  const [notes, oneOffs] = await Promise.all([
    notesOn({ supporterId: supporter.summary.id }),
    supporterOneOffs(supporter.summary.id),
  ]);
  return (
    <>
      <Breadcrumb href="/staff/supporters">{staffCopy.nav.supporters}</Breadcrumb>
      <SupporterDetails
        supporter={supporter}
        erase={<EraseLink supporterId={supporter.summary.id} />}
        oneOffs={<OneOffTable threads={oneOffs} />}
        notes={
          <Notes
            notes={notes}
            supporterId={supporter.summary.id}
            reader={staff}
            at={now().toISOString()}
            add={addNoteNow}
            edit={editNoteNow}
            remove={deleteNoteNow}
          />
        }
      />
    </>
  );
}
