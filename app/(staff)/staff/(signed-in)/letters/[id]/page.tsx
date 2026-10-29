import type { Metadata } from "next";
import { found } from "@/lib/found";
import { getSupporterLetter } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { letterId } from "@/lib/staff-search";
import LetterDetails, { letterTitle } from "../../../_components/LetterDetails";

type Params = { params: Promise<{ id: string }> };

/** The supporter's letter with the ID in the URL, or a 404. */
async function letterOf(params: Params["params"]) {
  return found(await getSupporterLetter(found(letterId((await params).id))));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff("supporters");
  return { title: letterTitle(await letterOf(params)) };
}

/** A supporter's letter: who it's from and to, how it stands, what happened to it, and where to read it. */
export default async function LetterPage({ params }: Params) {
  await requireStaff("supporters");
  return <LetterDetails letter={await letterOf(params)} />;
}
