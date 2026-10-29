import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { askToEdit } from "@/lib/server/asks";
import { requireStaff } from "@/lib/server/staff-auth";
import { askFormSearch, type ParamValue } from "@/lib/staff-search";
import { deleteAskNow, saveAskNow } from "../../../actions";
import AskForm from "../../../_components/AskForm";
import Breadcrumb from "../../../_components/Breadcrumb";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, ParamValue>> };

export async function generateMetadata({ params }: Pick<Params, "params">): Promise<Metadata> {
  await requireStaff();
  return { title: staffCopy.asks.editTitle(found(await askToEdit((await params).slug)).title) };
}

/** An ask, to change or delete. */
export default async function AskPage({ params, searchParams }: Params) {
  await requireStaff();
  const ask = found(await askToEdit((await params).slug));
  const { back, notice } = askFormSearch(await searchParams);
  return (
    <>
      <Breadcrumb href="/staff/asks">{staffCopy.asks.title}</Breadcrumb>
      <h1>{staffCopy.asks.editTitle(ask.title)}</h1>
      <AskForm ask={ask} back={back} notice={notice} save={saveAskNow} remove={deleteAskNow} />
    </>
  );
}
