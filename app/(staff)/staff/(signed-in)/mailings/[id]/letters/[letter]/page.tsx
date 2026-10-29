import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { letterThread } from "@/lib/server/letter-threads";
import { requireStaff } from "@/lib/server/staff-auth";
import { letterId, mailingId } from "@/lib/staff-search";
import Breadcrumb from "../../../../../_components/Breadcrumb";
import LetterThread from "../../../../../_components/LetterThread";

type Params = { params: Promise<{ id: string; letter: string }> };

/** The mailing's letter in the URL, with its thread, or a 404. */
async function threadOf(params: Params["params"]) {
  const { id, letter } = await params;
  return found(await letterThread(found(mailingId(id)), found(letterId(letter))));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff();
  return { title: staffCopy.letterThread.title((await threadOf(params)).politician.name) };
}

/** One of PauseAI's letters, as it went, and every reply in its thread; Open in Gmail for the one who sent it. */
export default async function LetterThreadPage({ params }: Params) {
  const { email } = await requireStaff();
  const thread = await threadOf(params);
  return (
    <>
      <Breadcrumb href={`/staff/mailings/${thread.mailingId}`}>{thread.mailingTitle}</Breadcrumb>
      <LetterThread thread={thread} me={email} />
    </>
  );
}
