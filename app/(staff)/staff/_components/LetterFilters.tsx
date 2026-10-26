import { Button, ButtonLink } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LettersSearch } from "@/lib/staff-search";
import StaffFilters from "./StaffFilters";

const copy = staffCopy.letters;

/**
 * Which letters the letters page lists: by a search of the sender and MP,
 * then the table's columns in its order. Keyed on the filters, so a new
 * URL, such as Reset's, gives a fresh form, not the old choices.
 */
export default function LetterFilters({ search }: { search: LettersSearch }) {
  return (
    <StaffFilters key={JSON.stringify(search)} action="/staff/letters">
      <Field label={copy.search}>
        <TextInput type="search" name="q" defaultValue={search.q} />
      </Field>
      <Button variant="primary" size="small" type="submit">
        {staffCopy.search}
      </Button>
      <Field label={copy.columns.consent}>
        <Select name="consent" defaultValue={search.consent}>
          <option value="">{copy.allStatuses}</option>
          <option value="yes">{copy.consent.yes}</option>
          <option value="no">{copy.consent.no}</option>
        </Select>
      </Field>
      <Field label={copy.columns.campaign}>
        <Select name="campaign" defaultValue={search.campaign}>
          <option value="">{copy.allStatuses}</option>
          {campaigns.map((campaign) => (
            <option key={campaign.slug} value={campaign.slug}>
              {campaign.title}
            </option>
          ))}
        </Select>
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
      <ButtonLink variant="ghost" size="small" href="/staff/letters">
        {staffCopy.resetFilters}
      </ButtonLink>
    </StaffFilters>
  );
}
