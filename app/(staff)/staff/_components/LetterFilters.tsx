import { Button, ButtonLink } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LettersSearch } from "@/lib/staff-search";
import styles from "./StaffForms.module.css";

const copy = staffCopy.letters;

/**
 * Which letters the letters page lists: by a search, status and whether
 * answered. A GET form, so the URL holds the filter.
 */
export default function LetterFilters({ search }: { search: LettersSearch }) {
  return (
    <FilterForm method="get" action="/staff/letters" className={styles.filters}>
      <Field label={copy.search}>
        <TextInput type="search" name="q" defaultValue={search.q} />
      </Field>
      <Field label={copy.columns.status}>
        <Select name="status" defaultValue={search.status}>
          <option value="">{copy.allStatuses}</option>
          {Object.entries(copy.status).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.columns.replied}>
        <Select name="answered" defaultValue={search.answered}>
          <option value="">{copy.allStatuses}</option>
          <option value="yes">{copy.answered.yes}</option>
          <option value="no">{copy.answered.no}</option>
        </Select>
      </Field>
      <Button variant="primary" size="small" type="submit">
        {copy.filter}
      </Button>
      <ButtonLink variant="ghost" size="small" href="/staff/letters">
        {staffCopy.resetFilters}
      </ButtonLink>
    </FilterForm>
  );
}
