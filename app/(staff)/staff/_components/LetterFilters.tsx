import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LettersSearch } from "@/lib/staff-search";
import styles from "./StaffForms.module.css";

const copy = staffCopy.letters;

/**
 * Which letters the letters page lists: by a search, status and whether
 * answered. A GET form, so the URL holds the filter. One supporter's
 * letters, reached from their page, has no field: it's kept through the
 * form, and said above it with a way back to everyone's.
 */
export default function LetterFilters({ search }: { search: LettersSearch }) {
  return (
    <>
      {search.supporter && (
        <p>
          <Muted>{copy.oneSupporter}</Muted> <Link href="/staff/letters">{copy.everyone}</Link>
        </p>
      )}
      <FilterForm method="get" action="/staff/letters" className={styles.filters}>
        {search.supporter && <input type="hidden" name="supporter" value={search.supporter} />}
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
      </FilterForm>
    </>
  );
}
