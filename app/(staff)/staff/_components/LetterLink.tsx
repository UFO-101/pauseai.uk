import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SentLetter } from "@/lib/server/email";

/** A letter an email was, by whom it was to, linked to its page when `linked`, as only staff with `supporters` can open it. */
export default function LetterLink({ letter, linked }: { letter: SentLetter; linked: boolean }) {
  const words = `${staffCopy.emails.letterTo} ${letter.to}`;
  return linked ? <Link href={`/staff/letters/${letter.id}`}>{words}</Link> : <>{words}</>;
}
