import { buttonClass } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./EraseLink.module.css";
import StaffLink from "./ui/StaffLink";

/** At the foot of a supporter's page, out of the way: a note of when to erase them, and the red button to the page that does. */
export default function EraseLink({ supporterId }: { supporterId: number }) {
  return (
    <p className={styles.erase}>
      <StaffLink
        className={buttonClass({ variant: "danger", size: "small" })}
        href={`/staff/supporters/${supporterId}/erase`}
      >
        {staffCopy.erase.title}
      </StaffLink>
      <Muted>{staffCopy.erase.note}</Muted>
    </p>
  );
}
