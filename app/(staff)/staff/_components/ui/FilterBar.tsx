import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Controls";
import { staffCopy } from "@/lib/content/staff-interface";
import { filtersPath } from "@/lib/staff-search";
import Menu from "./Menu";
import styles from "./FilterBar.module.css";

export type FilterOption = { value: string; label: string };

/**
 * One of a list's filters: its URL parameter, its name, and its choices. A
 * choice whose value is blank is the filter's default, offered only to go
 * back to it. One `after` another is chosen in the second half of that
 * one's chip, and goes with it.
 */
export type Filter = {
  name: string;
  label: string;
  options: FilterOption[];
  after?: string;
};

const copy = staffCopy.filters;

/**
 * The search and each filter that's on, in words, as their chips say them:
 * for a download's filename.
 */
export function filterWords(filters: Filter[], values: Record<string, string>, search: string): string[] {
  const words = values[search] ? [`${staffCopy.search} ${values[search]}`] : [];
  for (const filter of filters) {
    const value = values[filter.name];
    if (value) words.push(`${filter.label} ${filter.options.find((o) => o.value === value)?.label ?? value}`);
  }
  return words;
}

// More choices than this go in columns.
const MANY = 12;

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
    <ul className={`${styles.choices} ${options.length > MANY ? styles.many : ""}`}>
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
 * that's on, which opens its choices and a way to remove it (one with a
 * filter after it is a chip in two halves, a menu each); "+ Filter",
 * which opens every other filter's choices; and Clear filters, while anything
 * is on. Every choice is a link, so the URL holds the filters. `values`
 * are the URL's parameters as typed: a change keeps the rest, but for the
 * page, and Clear filters clears the sort too, keeping only those named in
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
  const off = filters.filter((filter) => !values[filter.name] && !filter.after);
  const hidden = Object.entries(values).filter(([name, value]) => value && name !== search.name && name !== "page");
  const kept = Object.fromEntries(keep.map((name) => [name, values[name] ?? ""]));
  // The words of the choice made, or, for one not on, of its blank choice.
  const choiceOf = (filter: Filter) => {
    const value = values[filter.name] ?? "";
    return filter.options.find((option) => option.value === value)?.label ?? value;
  };
  // A filter's chip: its menu has its choices and, but in a chip's second half, a way to remove it.
  const chip = (filter: Filter, label: string, second = false) => (
    <Menu
      key={filter.name}
      id={`filter-${filter.name}`}
      trigger={styles.chip}
      wide={filter.options.length > MANY}
      label={label}
    >
      <p className={styles.heading}>{filter.label}</p>
      <Choices
        options={filter.options}
        current={values[filter.name] ?? ""}
        href={(v) => href({ ...without(filter.name), [filter.name]: v })}
      />
      {!second && (
        <Link href={href(without(filter.name))} className={styles.remove}>
          {copy.remove}
        </Link>
      )}
    </Menu>
  );
  return (
    // Keyed on the filters, so the menu chosen from closes when they change.
    <div key={filtersPath(path, values)} className={styles.bar}>
      <form method="get" action={path} className={styles.search} role="search">
        <span className={styles.box}>
          <TextInput
            type="search"
            name={search.name}
            defaultValue={values[search.name]}
            aria-label={search.label}
            placeholder={staffCopy.search}
          />
          {values[search.name] && (
            <Link href={href({ [search.name]: "" })} className={styles.clear} aria-label={copy.clearSearch}>
              ×
            </Link>
          )}
        </span>
        {hidden.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button variant="primary" size="small" fit type="submit">
          {staffCopy.search}
        </Button>
      </form>
      {on
        .filter((filter) => !(filter.after && values[filter.after]))
        .map((filter) => {
          const next = filters.find((f) => f.after === filter.name);
          return next ? (
            // A filter and the one that comes after it: one lozenge in two halves, each its own menu.
            <span key={filter.name} className={styles.pair} role="group" aria-label={filter.label}>
              {chip(filter, choiceOf(filter))}
              {chip(next, choiceOf(next), true)}
            </span>
          ) : (
            chip(filter, `${filter.label}: ${choiceOf(filter)}`)
          );
        })}
      {off.length > 0 && (
        <Menu id="filter-add" trigger={styles.add} label={copy.add} wide>
          <div className={styles.groups}>
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
          </div>
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
