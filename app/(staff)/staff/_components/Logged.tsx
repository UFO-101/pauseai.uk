import { Fragment, type CSSProperties, type ReactNode } from "react";
import IconButton from "@/components/ui/IconButton";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./Logged.module.css";

/** Parts of a line, between middle dots. */
export function DotParts({ children }: { children: ReactNode[] }) {
  return (
    <>
      {children.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <Muted> · </Muted>}
          {part}
        </Fragment>
      ))}
    </>
  );
}

/**
 * A {} button that opens `details` as logged, as JSON, in a bubble by the
 * button until clicked away. `id` names its bubble, one per page.
 */
export function LoggedJson({ id, details }: { id: string; details: unknown }) {
  return (
    <>
      <IconButton
        look="outline"
        size={28}
        aria-label={staffCopy.changes.json}
        popoverTarget={id}
        style={{ anchorName: `--${id}` } as CSSProperties}
      >
        {"{}"}
      </IconButton>
      <pre id={id} popover="auto" className={styles.json} style={{ positionAnchor: `--${id}` } as CSSProperties}>
        {JSON.stringify(details, null, 2)}
      </pre>
    </>
  );
}
