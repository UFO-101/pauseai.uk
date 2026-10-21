import { Button } from "@/components/ui/Button";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { IMPORT_JOBS } from "@/lib/import-runs";
import { Select } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import styles from "./StaffForms.module.css";

/** Which job's runs the history page lists. A GET form, so the URL holds the filter. */
export default function RunFilters({ job }: { job: string }) {
  return (
    <FilterForm method="get" action="/staff/import-history" className={styles.filters}>
      <Field label={staffCopy.history.job} className={styles.narrow}>
        <Select name="job" defaultValue={job}>
          <option value="">{staffCopy.history.allJobs}</option>
          {IMPORT_JOBS.map((value) => (
            <option key={value} value={value}>
              {jobTitles[value]}
            </option>
          ))}
        </Select>
      </Field>
      <Button variant="primary" size="small" type="submit">
        {staffCopy.history.filter}
      </Button>
    </FilterForm>
  );
}
