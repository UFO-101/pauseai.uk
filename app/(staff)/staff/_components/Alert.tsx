import type { ReactNode } from "react";
import Strip from "./ui/Strip";

/**
 * A message that something is wrong or waiting, as a strip read out at
 * once (ui/Strip): red for an error, as an alert; amber for something
 * waiting, as a status.
 */
export default function Alert({ tone = "red", children }: { tone?: "amber" | "red"; children: ReactNode }) {
  return (
    <Strip tone={tone} announce>
      <span>{children}</span>
    </Strip>
  );
}
