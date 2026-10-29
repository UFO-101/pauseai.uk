import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { requireStaff } from "@/lib/server/staff-auth";
import { askFormSearch, type ParamValue } from "@/lib/staff-search";
import { deleteAskNow, saveAskNow } from "../../../actions";
import AskForm from "../../../_components/AskForm";
import Breadcrumb from "../../../_components/Breadcrumb";

export const metadata: Metadata = { title: staffCopy.asks.newTitle };

/** A new ask: its form, which goes back to the page it came from, such as a mailing's. */
export default async function NewAskPage({ searchParams }: { searchParams: Promise<Record<string, ParamValue>> }) {
  await requireStaff();
  const { back, notice } = askFormSearch(await searchParams);
  return (
    <>
      <Breadcrumb href="/staff/asks">{staffCopy.asks.title}</Breadcrumb>
      <h1>{staffCopy.asks.newTitle}</h1>
      <AskForm ask={null} back={back} notice={notice} save={saveAskNow} remove={deleteAskNow} />
    </>
  );
}
