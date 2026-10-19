import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./StaffForms.module.css";

/** Which letters the letters page lists, by status. A GET form, so the URL holds the filter. */
export default function LetterFilters({ status }: { status: string }) {
  return (
    <FilterForm method="get" action="/staff/letters" className={styles.filters}>
      <Field label={staffCopy.letters.columns.status}>
        <Select name="status" defaultValue={status}>
          <option value="">{staffCopy.letters.allStatuses}</option>
          {Object.entries(staffCopy.letters.status).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Button variant="primary" size="small" type="submit">
        {staffCopy.letters.filter}
      </Button>
    </FilterForm>
  );
}
