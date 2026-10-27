import Form from "next/form";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { staffCopy } from "@/lib/content/staff-interface";
import { filtersPath, firstOf, NOT, notValue, valuesOf, type Params } from "@/lib/staff-search";
import ChoiceSearch from "./ChoiceSearch";
import FormPending from "./FormPending";
import ListLink from "./ListLink";
import Menu from "./Menu";
import styles from "./FilterBar.module.css";

export type FilterOption = { value: string; label: string };

/**
 * One of a list's filters: its URL parameter, its name, and its choices. A
 * choice whose value is blank is the filter's default, offered only to go
 * back to it. One `after` another is chosen in the second half of that
 * one's chip, and goes with it. One that can `repeat` can be chosen more
 * than once, a chip each, and finds what has any of them; it can leave out
 * too, a choice marked with NOT, which finds what has none of them. A `searchable`
 * one has a box over its choices, which show only once something's typed
 * in it, those that have it. A
 * `place` one takes words typed, a postcode or a town, and how far from it
 * (its parameter `place.within`), in a small form; its options give the
 * words found for what was typed.
 */
export type Filter = {
  name: string;
  label: string;
  options: FilterOption[];
  after?: string;
  repeat?: boolean;
  searchable?: boolean;
  place?: { within: string; distances: FilterOption[]; placeholder: string };
};

const copy = staffCopy.filters;

/** A value of `filter` in words: its name and choice, joined by `join`, or that it's left out. */
function valueWords(filter: Filter, value: string, join: string): string {
  const { value: plain, not } = notValue(value);
  const choice = filter.options.find((o) => o.value === plain)?.label ?? plain;
  return not ? copy.notChip(filter.label, choice) : `${filter.label}${join}${choice}`;
}

/**
 * The search and each filter that's on, in words, as their chips say them:
 * for a download's filename.
 */
export function filterWords(filters: Filter[], values: Params, search: string): string[] {
  const words = values[search] ? [`${staffCopy.search} ${firstOf(values[search])}`] : [];
  for (const filter of filters) {
    for (const value of valuesOf(values[filter.name])) words.push(valueWords(filter, value, " "));
  }
  return words;
}

/** The mark on a chip that leaves out: a circle, struck through. */
function NotIcon() {
  return (
    <svg className={styles.notIcon} width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M3.5 12.5l9-9" />
    </svg>
  );
}

/** A list of choices, each a link; the one chosen marked; with `search`, a box over it that narrows it. */
function Choices({
  options,
  current,
  href,
  search,
}: {
  options: FilterOption[];
  current: string;
  href: (value: string) => string;
  search?: string;
}) {
  return (
    <>
      {search && <ChoiceSearch label={search} />}
      <ul className={styles.choices} data-search={search ? "empty" : undefined}>
        {options.map((option) => (
          <li key={option.value}>
            <ListLink href={href(option.value)} aria-current={option.value === current ? "true" : undefined}>
              {option.label}
            </ListLink>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * A place filter's form: the words, how far from them, and its button,
 * keeping every other parameter of the list (`others`) but its page.
 */
function PlaceForm({
  path,
  filter,
  values,
  others,
}: {
  path: string;
  filter: Filter;
  values: Params;
  others: [string, string][];
}) {
  const place = filter.place!;
  return (
    <Form action={path} className={styles.placeForm}>
      {others.map(([name, value]) => (
        <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
      ))}
      <TextInput
        type="search"
        name={filter.name}
        defaultValue={firstOf(values[filter.name])}
        aria-label={filter.label}
        placeholder={place.placeholder}
        required
      />
      <Select
        name={place.within}
        defaultValue={firstOf(values[place.within]) || place.distances[1].value}
        aria-label={staffCopy.filters.within}
      >
        {place.distances.map((distance) => (
          <option key={distance.value} value={distance.value}>
            {distance.label}
          </option>
        ))}
      </Select>
      <Button variant="primary" size="small" fit type="submit">
        {staffCopy.search}
      </Button>
      <FormPending />
    </Form>
  );
}

/**
 * A staff list's filters (docs/style-guide.md, "Filters"): the search box,
 * with its button and an × that empties it; then a chip for each filter
 * that's on, which opens its choices and a way to remove it (one with a
 * filter after it is a chip in two halves, a menu each; one chosen more
 * than once, a chip for each choice, one it leaves out marked so); "+
 * Filter", which lists every other filter, and one that repeats, a row
 * each, its choices opening under it, cut in two with "Except", which lists
 * those that repeat to choose one to leave out; and Clear filters, while
 * anything is on. A repeating filter's chip can turn its choice from found
 * to left out, and back. Every choice is a link, so the URL holds
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
  // Removing a filter removes those that come after it, and a place's distance.
  const without = (name: string) =>
    Object.fromEntries(
      [
        name,
        ...filters.filter((f) => f.after === name).map((f) => f.name),
        ...filters.filter((f) => f.name === name && f.place).map((f) => f.place!.within),
      ].map((n) => [n, ""]),
    );
  const on = filters.filter((filter) => chosen(filter.name).length > 0);
  // Those "+ Filter" offers, each with the choices it offers: one not on, or one that repeats, its other
  // choices, found or left out; a place, its form. Except offers those that repeat.
  const offered = filters
    .filter((filter) => !filter.after && (filter.repeat || chosen(filter.name).length === 0))
    .map((filter) => {
      const taken = chosen(filter.name).map((value) => notValue(value).value);
      return { filter, options: filter.options.filter((option) => option.value && !taken.includes(option.value)) };
    })
    .filter(({ filter, options }) => filter.place || options.length > 0);
  const negatable = offered.filter(({ filter }) => filter.repeat);
  const hidden = Object.entries(values)
    .filter(([name]) => name !== search.name && name !== "page")
    .flatMap(([name, value]) => valuesOf(value).map((one) => [name, one] as const));
  const kept = Object.fromEntries(keep.map((name) => [name, values[name] ?? ""]));
  const label = (filter: Filter, value: string) =>
    filter.options.find((option) => option.value === value)?.label ?? value;
  // A place filter's chip: the words found, and how far.
  const placeLabel = (filter: Filter, value: string) => {
    const within = firstOf(values[filter.place!.within]);
    const distance = filter.place!.distances.find((d) => d.value === within) ?? filter.place!.distances[1];
    return `${filter.label}: ${label(filter, value)}, ${distance.label}`;
  };
  // Every parameter but a place filter's own and the page, for its form to keep.
  const othersThan = (filter: Filter) =>
    hidden.filter(([name]) => name !== filter.name && name !== filter.place!.within) as [string, string][];
  // A filter's chip, for `value` of it: its menu has its choices and, but in a chip's second half, a way to
  // remove it. A choice in a repeating filter's chip changes that one value, keeping it found or left out, and
  // the chip can turn it the other way.
  const chip = (filter: Filter, value: string, text: string, second = false) => {
    const { value: plain, not } = notValue(value);
    const others = chosen(filter.name).filter((v) => v !== value);
    const choose = (v: string) =>
      filter.repeat
        ? href({ [filter.name]: [...others, not ? NOT + v : v] })
        : href({ ...without(filter.name), [filter.name]: v });
    return (
      <Menu
        key={`${filter.name}-${value}`}
        id={`filter-${filter.name}-${value}`}
        trigger={not ? `${styles.chip} ${styles.not}` : styles.chip}
        label={
          <>
            {not && <NotIcon />}
            {text}
          </>
        }
      >
        <p className={styles.heading}>{filter.label}</p>
        {filter.place ? (
          <PlaceForm path={path} filter={filter} values={values} others={othersThan(filter)} />
        ) : (
          <Choices
            options={filter.options}
            current={plain}
            href={choose}
            search={filter.searchable ? copy.narrow : undefined}
          />
        )}
        {(filter.repeat || !second) && (
          <p className={styles.actions}>
            {filter.repeat && (
              <ListLink href={href({ [filter.name]: [...others, not ? plain : NOT + plain] })}>
                {not ? copy.onlyInstead : copy.exceptInstead}
              </ListLink>
            )}
            {!second && (
              <ListLink
                href={filter.repeat && others.length > 0 ? href({ [filter.name]: others }) : href(without(filter.name))}
              >
                {copy.remove}
              </ListLink>
            )}
          </p>
        )}
      </Menu>
    );
  };
  // "+ Filter"'s menu, or Except's: a filter a row, its choices opening under it, one at a time; a choice
  // added found, or left out.
  const groups = (list: typeof offered, not: boolean) => (
    <div className={styles.groups}>
      {list.map(({ filter, options }) => (
        <details key={filter.name} name={not ? "filter-except" : "filter-add"} className={styles.group}>
          <summary>{filter.label}</summary>
          {filter.place ? (
            <PlaceForm path={path} filter={filter} values={values} others={othersThan(filter)} />
          ) : (
            <Choices
              options={options}
              current=""
              href={(v) => href({ [filter.name]: [...chosen(filter.name), not ? NOT + v : v] })}
              search={filter.searchable ? copy.narrow : undefined}
            />
          )}
        </details>
      ))}
    </div>
  );
  return (
    // Keyed on the filters, so the menu chosen from closes when they change.
    <div key={filtersPath(path, values)} className={styles.bar}>
      <Form action={path} className={styles.search} role="search">
        <span className={styles.box}>
          <TextInput
            type="search"
            name={search.name}
            defaultValue={firstOf(values[search.name])}
            aria-label={search.label}
            placeholder={search.label}
          />
          {values[search.name] && (
            <ListLink href={href({ [search.name]: "" })} className={styles.clear} aria-label={copy.clearSearch}>
              ×
            </ListLink>
          )}
        </span>
        {hidden.map(([name, value]) => (
          <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
        ))}
        <Button variant="primary" size="small" fit type="submit">
          {staffCopy.search}
        </Button>
        <FormPending />
      </Form>
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
          if (filter.place) return chip(filter, value, placeLabel(filter, value));
          return chosen(filter.name).map((one) => chip(filter, one, valueWords(filter, one, ": ")));
        })}
      {offered.length > 0 &&
        (negatable.length > 0 ? (
          // "+ Filter" and Except: one lozenge, cut down the middle, a menu each.
          <span className={styles.pair} role="group" aria-label={copy.add}>
            <Menu id="filter-add" trigger={styles.add} label={copy.add}>
              {groups(offered, false)}
            </Menu>
            <Menu
              id="filter-except"
              trigger={styles.add}
              label={
                <>
                  <NotIcon />
                  {copy.except}
                </>
              }
            >
              <p className={styles.groupsHeading}>{copy.exceptHeading}</p>
              {groups(negatable, true)}
            </Menu>
          </span>
        ) : (
          <Menu id="filter-add" trigger={styles.add} label={copy.add}>
            {groups(offered, false)}
          </Menu>
        ))}
      {(on.length > 0 || values[search.name]) && (
        <ListLink href={filtersPath(path, kept)} className={styles.clearAll}>
          {staffCopy.resetFilters}
        </ListLink>
      )}
    </div>
  );
}
