import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Controls";
import { staffCopy } from "@/lib/content/staff-interface";
import { filtersPath, firstOf, valuesOf, type Params } from "@/lib/staff-search";
import Menu from "./Menu";
import styles from "./FilterBar.module.css";

export type FilterOption = { value: string; label: string };

/**
 * One of a list's filters: its URL parameter, its name, and its choices. A
 * choice whose value is blank is the filter's default, offered only to go
 * back to it. One `after` another is chosen in the second half of that
 * one's chip, and goes with it. One that can `repeat` can be chosen more
 * than once, a chip each, and finds what has any of them.
 */
export type Filter = {
  name: string;
  label: string;
  options: FilterOption[];
  after?: string;
  repeat?: boolean;
};

const copy = staffCopy.filters;

/**
 * The search and each filter that's on, in words, as their chips say them:
 * for a download's filename.
 */
export function filterWords(filters: Filter[], values: Params, search: string): string[] {
  const words = values[search] ? [`${staffCopy.search} ${firstOf(values[search])}`] : [];
  for (const filter of filters) {
    for (const value of valuesOf(values[filter.name])) {
      words.push(`${filter.label} ${filter.options.find((o) => o.value === value)?.label ?? value}`);
    }
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
 * filter after it is a chip in two halves, a menu each; one chosen more
 * than once, a chip for each choice); "+ Filter", which opens every other
 * filter's choices, and the other choices of one that repeats; and Clear
 * filters, while anything is on. Every choice is a link, so the URL holds
 * the filters. `values` are the URL's parameters as typed: a change keeps
 * the rest, but for the page, and Clear filters clears the sort too,
 * keeping only those named in `keep`, such as a tab.
 */
export default function FilterBar({
  path,
  values,
  search,
  filters,
  keep = [],
}: {
  path: string;
  values: Params;
  search: { name: string; label: string };
  filters: Filter[];
  keep?: string[];
}) {
  const href = (changes: Params) => filtersPath(path, values, { ...changes, page: "" });
  const chosen = (name: string) => valuesOf(values[name]);
  // Removing a filter removes those that come after it.
  const without = (name: string) =>
    Object.fromEntries([name, ...filters.filter((f) => f.after === name).map((f) => f.name)].map((n) => [n, ""]));
  const on = filters.filter((filter) => chosen(filter.name).length > 0);
  // Those "+ Filter" offers, each with the choices it offers: one not on, or one that repeats, its other choices.
  const offered = filters
    .filter((filter) => !filter.after && (filter.repeat || chosen(filter.name).length === 0))
    .map((filter) => ({
      filter,
      options: filter.options.filter((option) => option.value && !chosen(filter.name).includes(option.value)),
    }))
    .filter(({ options }) => options.length > 0);
  const hidden = Object.entries(values)
    .filter(([name]) => name !== search.name && name !== "page")
    .flatMap(([name, value]) => valuesOf(value).map((one) => [name, one] as const));
  const kept = Object.fromEntries(keep.map((name) => [name, values[name] ?? ""]));
  const label = (filter: Filter, value: string) =>
    filter.options.find((option) => option.value === value)?.label ?? value;
  // A filter's chip, for `value` of it: its menu has its choices and, but in a chip's second half, a way to
  // remove it. A choice in a repeating filter's chip changes that one value.
  const chip = (filter: Filter, value: string, text: string, second = false) => {
    const others = chosen(filter.name).filter((v) => v !== value);
    const choose = (v: string) =>
      filter.repeat ? href({ [filter.name]: [...others, v] }) : href({ ...without(filter.name), [filter.name]: v });
    return (
      <Menu
        key={`${filter.name}-${value}`}
        id={`filter-${filter.name}-${value}`}
        trigger={styles.chip}
        wide={filter.options.length > MANY}
        label={text}
      >
        <p className={styles.heading}>{filter.label}</p>
        <Choices options={filter.options} current={value} href={choose} />
        {!second && (
          <Link
            href={filter.repeat && others.length > 0 ? href({ [filter.name]: others }) : href(without(filter.name))}
            className={styles.remove}
          >
            {copy.remove}
          </Link>
        )}
      </Menu>
    );
  };
  return (
    // Keyed on the filters, so the menu chosen from closes when they change.
    <div key={filtersPath(path, values)} className={styles.bar}>
      <form method="get" action={path} className={styles.search} role="search">
        <span className={styles.box}>
          <TextInput
            type="search"
            name={search.name}
            defaultValue={firstOf(values[search.name])}
            aria-label={search.label}
            placeholder={search.label}
          />
          {values[search.name] && (
            <Link href={href({ [search.name]: "" })} className={styles.clear} aria-label={copy.clearSearch}>
              ×
            </Link>
          )}
        </span>
        {hidden.map(([name, value]) => (
          <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
        ))}
        <Button variant="primary" size="small" fit type="submit">
          {staffCopy.search}
        </Button>
      </form>
      {on
        .filter((filter) => !(filter.after && chosen(filter.after).length > 0))
        .flatMap((filter) => {
          const next = filters.find((f) => f.after === filter.name);
          const value = firstOf(values[filter.name]);
          if (next) {
            // A filter and the one that comes after it: one lozenge in two halves, each its own menu.
            const nextValue = firstOf(values[next.name]);
            return (
              <span key={filter.name} className={styles.pair} role="group" aria-label={filter.label}>
                {chip(filter, value, label(filter, value))}
                {chip(next, nextValue, label(next, nextValue), true)}
              </span>
            );
          }
          return chosen(filter.name).map((one) => chip(filter, one, `${filter.label}: ${label(filter, one)}`));
        })}
      {offered.length > 0 && (
        <Menu id="filter-add" trigger={styles.add} label={copy.add} wide>
          <div className={styles.groups}>
            {offered.map(({ filter, options }) => (
              <section key={filter.name} className={styles.group}>
                <p className={styles.heading}>{filter.label}</p>
                <Choices
                  options={options}
                  current=""
                  href={(v) => href({ [filter.name]: [...chosen(filter.name), v] })}
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
