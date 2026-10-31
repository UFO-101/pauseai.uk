import type { Metadata } from "next";
import { found } from "@/lib/found";
import { listAsks } from "@/lib/server/asks";
import { getSupporterLetter } from "@/lib/server/letters";
import { getPolitician } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { letterId } from "@/lib/staff-search";
import FindInGmail from "../../../_components/FindInGmail";
import { letterTitle } from "../../../_components/LetterHistory";
import { SupporterLetterThread } from "../../../_components/LetterThread";
import LetterView from "../../../_components/LetterView";
import { setAskStatus } from "../../../actions";

type Params = { params: Promise<{ id: string }> };

/** The supporter's letter with the ID in the URL, or a 404. */
async function letterOf(params: Params["params"]) {
  return found(await getSupporterLetter(found(letterId((await params).id))));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff("supporters");
  return { title: letterTitle(await letterOf(params)) };
}

/**
 * A supporter's letter: how it stands, the letter as an email, with Find it
 * in Gmail for its copy in the policy inbox, beside its campaign's ask, to
 * set the MP's answer, and its history.
 */
export default async function LetterPage({ params }: Params) {
  await requireStaff("supporters");
  const [letter, asks] = await Promise.all([letterOf(params), listAsks()]);
  const politician = found(await getPolitician(letter.politicianId));
  return (
    <LetterView letter={letter} politician={politician} asks={asks} setStatus={setAskStatus}>
      <SupporterLetterThread letter={letter} link={<FindInGmail find={letter.gmail} />} />
    </LetterView>
  );
}
