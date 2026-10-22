import { ButtonLink } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./EraseLink.module.css";

/** At the foot of a supporter's page, out of the way: a note of when to erase them, and the red button to the page that does. */
export default function EraseLink({ supporterId }: { supporterId: number }) {
  return (
    <p className={styles.erase}>
      <ButtonLink variant="danger" size="small" href={`/staff/supporters/${supporterId}/erase`}>
        {staffCopy.erase.title}
      </ButtonLink>
      <Muted>{staffCopy.erase.note}</Muted>
    </p>
  );
}
