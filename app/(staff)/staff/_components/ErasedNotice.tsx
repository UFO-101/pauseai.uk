import StatusMessage from "@/components/ui/StatusMessage";
import { staffCopy } from "@/lib/content/staff-interface";

/** After an erasure, at the top of the list: done. Nothing otherwise. */
export default function ErasedNotice({ erased }: { erased: string }) {
  if (erased === "1") return <StatusMessage>{staffCopy.erase.done}</StatusMessage>;
  return null;
}
