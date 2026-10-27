import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { staffCopy } from "@/lib/content/staff-interface";
import { filtersPath } from "@/lib/staff-search";
import Menu from "./Menu";
import styles from "./FilterBar.module.css";

export type FilterOption = { value: string; label: string };

/**
 * One of a list's filters: its URL parameter, its name, and its choices. A
 * choice whose value is blank is the filter's default, offered only to go
 * back to it. One `after` another is offered only once that one is on, and
 * goes with it; `chip` says it on its chip, given the choice's words.
 */
export type Filter = {
  name: string;
  label: string;
  options: FilterOption[];
  after?: string;
  chip?: (choice: string) => string;
};

const copy = staffCopy.filters;

/** A list of choices, each a link; the one chosen marked. */
function Choices({
  options,
  current,
  href,
}: {
  options: FilterOption[];
  current: string;
  href: (value: string) => string;
}) {
  return (
    <ul className={styles.choices}>
      {options.map((option) => (
        <li key={option.value}>
          <Link href={href(option.value)} aria-current={option.value === current ? "true" : undefined}>
            {option.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * A staff list's filters (docs/style-guide.md, "Filters"): the search box,
 * with its button and an × that empties it; then a chip for each filter
 * that's on, which opens its choices and a way to remove it; "+ Filter",
 * which opens every other filter's choices; and Clear all, while anything
 * is on. Every choice is a link, so the URL holds the filters. `values`
 * are the URL's parameters as typed: a change keeps the rest, but for the
 * page, and Clear all clears the sort too, keeping only those named in
 * `keep`, such as a tab.
 */
export default function FilterBar({
  path,
  values,
  search,
  filters,
  keep = [],
}: {
  path: string;
  values: Record<string, string>;
  search: { name: string; label: string };
  filters: Filter[];
  keep?: string[];
}) {
  const href = (changes: Record<string, string>) => filtersPath(path, values, { ...changes, page: "" });
  // Removing a filter removes those that come after it.
  const without = (name: string) =>
    Object.fromEntries([name, ...filters.filter((f) => f.after === name).map((f) => f.name)].map((n) => [n, ""]));
  const on = filters.filter((filter) => values[filter.name]);
  const off = filters.filter((filter) => !values[filter.name] && (!filter.after || values[filter.after]));
  const hidden = Object.entries(values).filter(([name, value]) => value && name !== search.name && name !== "page");
  const kept = Object.fromEntries(keep.map((name) => [name, values[name] ?? ""]));
  return (
    // Keyed on the filters, so the menu chosen from closes when they change.
    <div key={filtersPath(path, values)} className={styles.bar}>
      <form method="get" action={path} className={styles.search} role="search">
        <span className={styles.box}>
          <Field label={search.label}>
            <TextInput type="search" name={search.name} defaultValue={values[search.name]} />
          </Field>
          {values[search.name] && (
            <Link href={href({ [search.name]: "" })} className={styles.clear} aria-label={copy.clearSearch}>
              ×
            </Link>
          )}
        </span>
        {hidden.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button variant="primary" size="small" type="submit">
          {staffCopy.search}
        </Button>
      </form>
      {on.map((filter) => {
        const value = values[filter.name];
        const choice = filter.options.find((option) => option.value === value)?.label ?? value;
        return (
          <Menu
            key={filter.name}
            id={`filter-${filter.name}`}
            trigger={styles.chip}
            label={filter.chip ? filter.chip(choice) : `${filter.label}: ${choice}`}
          >
            <p className={styles.heading}>{filter.label}</p>
            <Choices
              options={filter.options}
              current={value}
              href={(v) => href({ ...without(filter.name), [filter.name]: v })}
            />
            <Link href={href(without(filter.name))} className={styles.remove}>
              {copy.remove}
            </Link>
          </Menu>
        );
      })}
      {off.length > 0 && (
        <Menu id="filter-add" trigger={styles.add} label={copy.add}>
          {off.map((filter) => (
            <section key={filter.name} className={styles.group}>
              <p className={styles.heading}>{filter.label}</p>
              <Choices
                options={filter.options.filter((option) => option.value)}
                current=""
                href={(v) => href({ [filter.name]: v })}
              />
            </section>
          ))}
        </Menu>
      )}
      {(on.length > 0 || values[search.name]) && (
        <Link href={filtersPath(path, kept)} className={styles.clearAll}>
          {staffCopy.resetFilters}
        </Link>
      )}
    </div>
  );
}
