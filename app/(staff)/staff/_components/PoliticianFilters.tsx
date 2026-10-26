import { Button, ButtonLink } from "@/components/ui/Button";
import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import type { PoliticiansSearch } from "@/lib/server/politicians";
import styles from "./StaffForms.module.css";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";

export type Filters = Omit<PoliticiansSearch, "sort" | "dir"> & {
  /** Every ask, to filter by an answer to one. */
  asks: Ask[];
  /** Every party a politician has. */
  parties: string[];
};

const copy = staffCopy.politicians;

/**
 * Search and filter the politicians list. A GET form, so the URL holds the
 * filter. Keyed on the filters, so a new URL, such as Reset's, gives a fresh
 * form, not the old choices. The answers to choose from are every kind's.
 */
export default function PoliticianFilters({
  q,
  house,
  status,
  party,
  flag,
  ask,
  answer,
  email,
  asks,
  parties,
}: Filters) {
  const answers = [...new Set(Object.values(ASK_STATUSES).flat())];
  return (
    <FilterForm
      key={[q, house, status, party, flag, ask, answer, email].join("\n")}
      method="get"
      action="/staff/politicians"
      className={styles.filters}
    >
      <Field label={copy.search}>
        <TextInput type="search" name="q" defaultValue={q} />
      </Field>
      <Field label={staffCopy.fields.house}>
        <Select name="house" defaultValue={house}>
          <option value="">{copy.allHouses}</option>
          {Object.entries(staffCopy.houses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.status}>
        <Select name="status" defaultValue={status}>
          <option value="">{copy.anyStatus}</option>
          {Object.entries(staffCopy.personStatuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.party}>
        <Select name="party" defaultValue={party}>
          <option value="">{copy.anyParty}</option>
          {parties.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.flag}>
        <Select name="flag" defaultValue={flag}>
          <option value="">{copy.anyFlag}</option>
          {Object.entries(copy.flags).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.ask}>
        <Select name="ask" defaultValue={ask}>
          <option value="">{copy.anyAsk}</option>
          {asks.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.answer}>
        <Select name="answer" defaultValue={answer}>
          <option value="">{copy.anyAnswer}</option>
          {answers.map((value) => (
            <option key={value} value={value}>
              {staffCopy.statuses[value]}
            </option>
          ))}
          <option value="none">{copy.noAnswer}</option>
        </Select>
      </Field>
      <Field label={staffCopy.fields.email}>
        <Select name="email" defaultValue={email}>
          <option value="">{copy.anyEmail}</option>
          <option value="blocked">{copy.emailBlocked}</option>
        </Select>
      </Field>
      <Button variant="primary" size="small" type="submit">
        {copy.searchButton}
      </Button>
      <ButtonLink variant="ghost" size="small" href="/staff/politicians">
        {staffCopy.resetFilters}
      </ButtonLink>
    </FilterForm>
  );
}
