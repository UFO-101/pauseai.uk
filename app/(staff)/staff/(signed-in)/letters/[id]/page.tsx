import type { Metadata } from "next";
import { found } from "@/lib/found";
import { getLetter } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { letterId } from "@/lib/staff-search";
import LetterDetails, { letterTitle } from "../../../_components/LetterDetails";

type Params = { params: Promise<{ id: string }> };

/** The letter with the ID in the URL, PauseAI's or, for staff who can see supporters, a supporter's; or a 404. */
async function letterOf(params: Params["params"]) {
  const { permissions } = await requireStaff();
  return found(await getLetter(found(letterId((await params).id)), permissions));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff();
  return { title: letterTitle(await letterOf(params)) };
}

/** One letter: who it's from and to, how it stands, what happened to it, and where to read it. */
export default async function LetterPage({ params }: Params) {
  await requireStaff();
  return <LetterDetails letter={await letterOf(params)} />;
}
