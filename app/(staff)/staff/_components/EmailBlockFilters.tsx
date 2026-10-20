import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./StaffForms.module.css";

/** Which blocked addresses the page lists: those that bounced, or complained. A GET form, so the URL holds the filter. */
export default function EmailBlockFilters({ kind }: { kind: string }) {
  return (
    <FilterForm method="get" action="/staff/blocked-emails" className={styles.filters}>
      <Field label={staffCopy.emails.columns.kind}>
        <Select name="kind" defaultValue={kind}>
          <option value="">{staffCopy.emails.allKinds}</option>
          <option value="hard">{staffCopy.emails.kinds.hard}</option>
          <option value="complaint">{staffCopy.emails.kinds.complaint}</option>
        </Select>
      </Field>
      <Button variant="primary" size="small" type="submit">
        {staffCopy.emails.filter}
      </Button>
    </FilterForm>
  );
}
