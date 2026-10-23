import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { recentLetters } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { letterId } from "@/lib/staff-search";
import Breadcrumb from "../../_components/Breadcrumb";
import LettersTable from "../../_components/LettersTable";
import StaffNav from "../../_components/StaffNav";
import StaffPage from "../../_components/ui/StaffPage";

type Params = { params: Promise<{ id: string }> };

/** The letter with the ID in the URL, or a 404. */
async function letterOf(params: Params["params"]) {
  const [letter] = await recentLetters({ letterId: found(letterId((await params).id)) });
  return found(letter);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireStaff("supporters");
  return { title: staffCopy.letters.oneTitle((await letterOf(params)).mpName) };
}

/** One letter, as its row in the letters list: where a letter is named elsewhere leads here. */
export default async function LetterPage({ params }: Params) {
  const { email, permissions } = await requireStaff("supporters");
  const letter = await letterOf(params);
  return (
    <StaffPage nav={<StaffNav email={email} account permissions={permissions} current="letters" />}>
      <Breadcrumb href="/staff/letters">{staffCopy.nav.letters}</Breadcrumb>
      <h1>{staffCopy.letters.oneTitle(letter.mpName)}</h1>
      <LettersTable letters={[letter]} />
    </StaffPage>
  );
}
