import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SupportersSearch } from "@/lib/staff-search";
import { SUPPORTER_SOURCES } from "@/lib/supporters";
import styles from "./StaffForms.module.css";
import TickedFilters from "./TickedFilters";

/** Search, filter and sort the supporters list. A GET form, so the URL holds the filter. */
export default function SupporterFilters({ search }: { search: SupportersSearch }) {
  const copy = staffCopy.supporters.filters;
  return (
    <FilterForm method="get" action="/staff/supporters" className={styles.filters}>
      <Field label={copy.search}>
        <TextInput type="search" name="q" defaultValue={search.q} />
      </Field>
      <Field label={copy.source}>
        <Select name="source" defaultValue={search.source}>
          <option value="">{copy.anySource}</option>
          {SUPPORTER_SOURCES.map((source) => (
            <option key={source} value={source}>
              {staffCopy.supporters.sources[source]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.active}>
        <Select name="active" defaultValue={search.active}>
          <option value="">{copy.anyTime}</option>
          {Object.entries(copy.activeWithin).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.from}>
        <TextInput type="date" name="from" defaultValue={search.from} />
      </Field>
      <Field label={copy.to}>
        <TextInput type="date" name="to" defaultValue={search.to} />
      </Field>
      <Field label={copy.sort}>
        <Select name="sort" defaultValue={search.sort}>
          {Object.entries(copy.sorts).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <TickedFilters
        boxes={[
          { name: "registered", label: copy.registered, ticked: search.registered !== "" },
          { name: "unsubscribed", label: copy.unsubscribed, ticked: search.unsubscribed !== "" },
          { name: "postcode", label: copy.postcode, ticked: search.postcode !== "" },
        ]}
      />
      <Button variant="primary" size="small" type="submit">
        {copy.filter}
      </Button>
    </FilterForm>
  );
}
