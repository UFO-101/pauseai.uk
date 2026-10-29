import type { Metadata } from "next";
import { found } from "@/lib/found";
import { getPauseaiLetter } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { letterId, mailingId } from "@/lib/staff-search";
import LetterDetails, { letterTitle } from "../../../../../_components/LetterDetails";

type Params = { params: Promise<{ id: string; letter: string }> };

/** PauseAI's letter with the IDs in the URL, its mailing's and its own; or a 404. */
async function letterOf(params: Params["params"]) {
  const { id, letter } = await params;
  return found(await getPauseaiLetter(found(mailingId(id)), found(letterId(letter))));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff();
  return { title: letterTitle(await letterOf(params)) };
}

/** One of a mailing's letters: to whom, how it stands, what happened to it, and where to find it in Gmail. */
export default async function MailingLetterPage({ params }: Params) {
  await requireStaff();
  return <LetterDetails letter={await letterOf(params)} />;
}
