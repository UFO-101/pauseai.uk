import type { Metadata } from "next";
import { found } from "@/lib/found";
import { letterThread } from "@/lib/server/letter-threads";
import { getPauseaiLetter } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { letterId, mailingId } from "@/lib/staff-search";
import LetterDetails, { letterTitle } from "../../../../../_components/LetterDetails";
import LetterThread from "../../../../../_components/LetterThread";

type Params = { params: Promise<{ id: string; letter: string }> };

/** The IDs in the URL, its mailing's and its letter's; or a 404. */
async function idsOf(params: Params["params"]): Promise<[number, number]> {
  const { id, letter } = await params;
  return [found(mailingId(id)), found(letterId(letter))];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff();
  return { title: letterTitle(found(await getPauseaiLetter(...(await idsOf(params))))) };
}

/**
 * One of a mailing's letters: to whom, how it stands, what happened to it;
 * then the letter as it went and every reply in its thread, with Open in
 * Gmail for the one who sent it.
 */
export default async function MailingLetterPage({ params }: Params) {
  const { email } = await requireStaff();
  const ids = await idsOf(params);
  const [letter, thread] = await Promise.all([getPauseaiLetter(...ids), letterThread(...ids)]);
  return (
    <LetterDetails letter={found(letter)}>
      <LetterThread thread={found(thread)} me={email} />
    </LetterDetails>
  );
}
