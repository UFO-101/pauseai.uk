import { Button, ButtonLink } from "@/components/ui/Button";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import type { PoliticiansSearch } from "@/lib/server/politicians";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import StaffFilters from "./StaffFilters";

/**
 * Search and filter the politicians list, among `parties`: the search,
 * then the table's columns in its order, then whether their address is
 * blocked. The column headings sort it; the form keeps that sort. Keyed on
 * the filters, so a new URL, such as Reset's, gives a fresh form, not the
 * old choices.
 */
export default function PoliticianFilters({ search, parties }: { search: PoliticiansSearch; parties: string[] }) {
  const copy = staffCopy.politicians;
  return (
    <StaffFilters key={JSON.stringify(search)} action="/staff/politicians">
      <Field label={copy.search}>
        <TextInput type="search" name="q" defaultValue={search.q} />
      </Field>
      <Button variant="primary" size="small" type="submit">
        {staffCopy.search}
      </Button>
      <Field label={staffCopy.fields.house}>
        <Select name="house" defaultValue={search.house}>
          <option value="">{copy.allHouses}</option>
          {Object.entries(staffCopy.houses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
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
      <Field label={staffCopy.politician.statusesTitle}>
        <Select name="campaign" defaultValue={search.campaign}>
          <option value="">{copy.anyCampaign}</option>
          {/* Every campaign: the bill's status comes from ControlAI's letter rather than staff, but it's a status. */}
          {campaigns.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={staffCopy.fields.email}>
        <Select name="email" defaultValue={search.email}>
          <option value="">{copy.anyEmail}</option>
          <option value="blocked">{copy.emailBlocked}</option>
        </Select>
      </Field>
      {search.sort && <input type="hidden" name="sort" value={search.sort} />}
      {search.dir && <input type="hidden" name="dir" value={search.dir} />}
      <ButtonLink variant="ghost" size="small" href="/staff/politicians">
        {staffCopy.resetFilters}
      </ButtonLink>
    </StaffFilters>
  );
}
