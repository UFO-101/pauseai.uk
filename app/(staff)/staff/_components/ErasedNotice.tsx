import { staffCopy } from "@/lib/content/staff-interface";
import { eraseLeftovers } from "@/lib/staff-search";
import Strip from "./ui/Strip";

/**
 * After an erasure, at the top of the list, read out: done, in green; or
 * done but something couldn't be cleared afterwards, in amber, with what
 * (`why`, as codes, a line each). Nothing otherwise.
 */
export default function ErasedNotice({ erased, why = "" }: { erased: string; why?: string }) {
  if (erased === "1")
    return (
      <Strip tone="green" announce>
        {staffCopy.erase.done}
      </Strip>
    );
  if (erased === "partly")
    return (
      <Strip tone="amber" announce>
        {staffCopy.erase.partly}
        <ul>
          {eraseLeftovers(why).map((leftover) => (
            <li key={leftover}>{staffCopy.erase.notCleared[leftover]}</li>
          ))}
        </ul>
      </Strip>
    );
  return null;
}
