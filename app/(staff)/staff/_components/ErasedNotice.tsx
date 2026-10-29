import { staffCopy } from "@/lib/content/staff-interface";
import Strip from "./ui/Strip";

/** After an erasure, at the top of the list: done, in green, read out. Nothing otherwise. */
export default function ErasedNotice({ erased }: { erased: string }) {
  if (erased === "1")
    return (
      <Strip tone="green" announce>
        {staffCopy.erase.done}
      </Strip>
    );
  return null;
}
