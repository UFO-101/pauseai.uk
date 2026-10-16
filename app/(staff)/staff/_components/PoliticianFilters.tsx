import { Button } from "@/components/ui/Button";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./staff.module.css";

export type Filters = { search: string; house: string; campaign: string };

/** Search and filter the politicians list. A GET form, so the URL holds the filter. */
export default function PoliticianFilters({ search, house, campaign }: Filters) {
  return (
    <form className={styles.filters} method="get" action="/staff/politicians">
      <label>
        {staffCopy.politicians.search}
        <input type="search" name="q" defaultValue={search} />
      </label>
      <label>
        {staffCopy.fields.house}
        <select name="house" defaultValue={house}>
          <option value="">{staffCopy.politicians.allHouses}</option>
          {Object.entries(staffCopy.houses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {staffCopy.politician.statusesTitle}
        <select name="campaign" defaultValue={campaign}>
          <option value="">{staffCopy.politicians.anyCampaign}</option>
          {/* Every campaign: the bill's status comes from ControlAI's letter rather than staff, but it's a status. */}
          {campaigns.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <Button variant="primary" size="small" type="submit">
        {staffCopy.politicians.searchButton}
      </Button>
    </form>
  );
}
