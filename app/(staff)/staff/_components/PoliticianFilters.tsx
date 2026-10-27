import { Button, ButtonLink } from "@/components/ui/Button";
import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import type { PoliticiansSearch } from "@/lib/server/politicians";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import StaffFilters from "./StaffFilters";

const copy = staffCopy.politicians;

/**
 * Search and filter the politicians list, among `parties` and `asks`: the
 * search, then the table's columns in its order, then Airtable's markers.
 * The house is the tabs over it, and the form keeps it. Status is those in
 * office unless another is chosen.
 * The answers to choose from are every kind's. The column headings sort
 * it; the form keeps that sort. Keyed on the filters, so a new URL, such as
 * Reset's, gives a fresh form, not the old choices.
 */
export default function PoliticianFilters({
  search,
  parties,
  asks,
}: {
  search: PoliticiansSearch;
  parties: string[];
  asks: Ask[];
}) {
  const answers = [...new Set(Object.values(ASK_STATUSES).flat())];
  return (
    <StaffFilters key={JSON.stringify(search)} action="/staff/politicians">
      <Field label={copy.search}>
        <TextInput type="search" name="q" defaultValue={search.q} />
      </Field>
      <Button variant="primary" size="small" type="submit">
        {staffCopy.search}
      </Button>
      <Field label={staffCopy.fields.party}>
        <Select name="party" defaultValue={search.party}>
          <option value="">{copy.allParties}</option>
          {parties.map((party) => (
            <option key={party} value={party}>
              {party}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.status}>
        <Select name="status" defaultValue={search.status === "in_office" ? "" : search.status}>
          <option value="">{staffCopy.personStatuses.in_office}</option>
          {Object.entries(staffCopy.personStatuses)
            .filter(([value]) => value !== "in_office")
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          <option value="any">{copy.anyStatus}</option>
        </Select>
      </Field>
      <Field label={copy.ask}>
        <Select name="ask" defaultValue={search.ask}>
          <option value="">{copy.anyAsk}</option>
          {asks.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={copy.answer}>
        <Select name="answer" defaultValue={search.answer}>
          <option value="">{copy.anyAnswer}</option>
          {answers.map((value) => (
            <option key={value} value={value}>
              {staffCopy.statuses[value]}
            </option>
          ))}
          <option value="none">{copy.noAnswer}</option>
        </Select>
      </Field>
      <Field label={copy.flag}>
        <Select name="flag" defaultValue={search.flag}>
          <option value="">{copy.anyFlag}</option>
          {Object.entries(copy.flags).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      {search.house && <input type="hidden" name="house" value={search.house} />}
      {search.sort && <input type="hidden" name="sort" value={search.sort} />}
      {search.dir && <input type="hidden" name="dir" value={search.dir} />}
      <ButtonLink variant="ghost" size="small" href="/staff/politicians">
        {staffCopy.resetFilters}
      </ButtonLink>
    </StaffFilters>
  );
}
