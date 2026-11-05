import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { askPageData } from "@/lib/server/asks";
import { requireStaff } from "@/lib/server/staff-auth";
import { firstOf, type ParamValue } from "@/lib/staff-search";
import AskView from "../../../_components/AskView";
import Breadcrumb from "../../../_components/Breadcrumb";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ answer?: ParamValue }> };

export async function generateMetadata({ params }: Pick<Params, "params">): Promise<Metadata> {
  await requireStaff();
  return { title: found(await askPageData((await params).slug)).title };
}

/** An ask: what they were asked, how we asked, and their answers. */
export default async function AskPage({ params, searchParams }: Params) {
  await requireStaff();
  const answer = firstOf((await searchParams).answer);
  const ask = found(await askPageData((await params).slug, answer || undefined));
  return (
    <>
      <Breadcrumb href="/staff/asks">{staffCopy.asks.title}</Breadcrumb>
      <AskView ask={ask} answer={answer} />
    </>
  );
}
