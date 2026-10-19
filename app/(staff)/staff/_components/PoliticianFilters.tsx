import { Button } from "@/components/ui/Button";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./StaffForms.module.css";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";

export type Filters = { search: string; house: string; campaign: string; email: string };

/** Search and filter the politicians list. A GET form, so the URL holds the filter. */
export default function PoliticianFilters({ search, house, campaign, email }: Filters) {
  return (
    <FilterForm method="get" action="/staff/politicians" className={styles.filters}>
      <Field label={staffCopy.politicians.search}>
        <TextInput type="search" name="q" defaultValue={search} />
      </Field>
      <Field label={staffCopy.fields.house}>
        <Select name="house" defaultValue={house}>
          <option value="">{staffCopy.politicians.allHouses}</option>
          {Object.entries(staffCopy.houses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={staffCopy.politician.statusesTitle}>
        <Select name="campaign" defaultValue={campaign}>
          <option value="">{staffCopy.politicians.anyCampaign}</option>
          {/* Every campaign: the bill's status comes from ControlAI's letter rather than staff, but it's a status. */}
          {campaigns.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={staffCopy.fields.email}>
        <Select name="email" defaultValue={email}>
          <option value="">{staffCopy.politicians.anyEmail}</option>
          <option value="blocked">{staffCopy.politicians.emailBlocked}</option>
        </Select>
      </Field>
      <Button variant="primary" size="small" type="submit">
        {staffCopy.politicians.searchButton}
      </Button>
    </FilterForm>
  );
}
