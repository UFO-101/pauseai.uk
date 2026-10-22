import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SentLetter } from "@/lib/server/email";

/** A letter an email was, by whom it was to, linked to it alone on the letters page. */
export default function LetterLink({ letter }: { letter: SentLetter }) {
  return (
    <Link href={`/staff/letters?letter=${letter.id}`}>
      {staffCopy.emails.letterTo} {letter.to}
    </Link>
  );
}
