import type { ReactNode } from "react";
import { Muted } from "@/components/ui/Text";

/** Over a list, faintly: how many it has, and the page; nothing when it has none, which the list says itself. */
export default function ListCount({ total, children }: { total: number; children: ReactNode }) {
  if (total === 0) return null;
  return (
    <p>
      <Muted>{children}</Muted>
    </p>
  );
}
