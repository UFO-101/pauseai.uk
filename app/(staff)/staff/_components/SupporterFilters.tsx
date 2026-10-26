import { Button, ButtonLink } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SupportersSearch } from "@/lib/staff-search";
import { EMAIL_TOPIC_REASONS, EMAIL_TOPICS } from "@/lib/email-permissions";
import { SUPPORTER_BADGES } from "@/lib/supporters";
import StaffFilters from "./StaffFilters";

/**
 * Search and filter the supporters list. Each filter is named after the
 * column it filters on. The table's column headings sort it; the form
 * keeps that sort. Keyed on the filters, so a new URL, such as Reset's,
 * gives a fresh form, not the old choices.
 */
export default function SupporterFilters({ search }: { search: SupportersSearch }) {
  const copy = staffCopy.supporters.filters;
  const { columns } = staffCopy.supporters;
  const topics = staffCopy.supporters.detail.permissions.topics;
  return (
    <StaffFilters key={JSON.stringify(search)} action="/staff/supporters">
      <Field label={copy.search}>
        <TextInput type="search" name="q" defaultValue={search.q} />
      </Field>
      <Button variant="primary" size="small" type="submit">
        {staffCopy.search}
      </Button>
      <Field label={columns.badges}>
        <Select name="activity" defaultValue={search.activity}>
          <option value="">{copy.anyActivity}</option>
          {SUPPORTER_BADGES.map((badge) => (
            <option key={badge} value={badge}>
              {staffCopy.supporters.badges[badge]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={columns.subscriptions}>
        <Select name="subscription" defaultValue={search.subscription}>
          <option value="">{copy.anySubscription}</option>
          {EMAIL_TOPICS.map((topic) => (
            <optgroup key={topic} label={topics[topic]}>
              {EMAIL_TOPIC_REASONS[topic].map((reason) => (
                <option key={reason} value={`${topic}:${reason}`}>
                  {copy.states[topic][reason]}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="blocked">{staffCopy.supporters.subscriptions.blocked}</option>
        </Select>
      </Field>
      {search.sort && <input type="hidden" name="sort" value={search.sort} />}
      {search.dir && <input type="hidden" name="dir" value={search.dir} />}
      <ButtonLink variant="ghost" size="small" href="/staff/supporters">
        {staffCopy.resetFilters}
      </ButtonLink>
    </StaffFilters>
  );
}
