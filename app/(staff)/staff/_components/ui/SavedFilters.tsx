import { Button, buttonClass } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { carriedParams, savedFilterHref, type SavedList } from "@/lib/saved-filters";
import type { SavedFiltersState } from "@/lib/server/saved-filters";
import { filtersPath, type Params } from "@/lib/staff-search";
import { staffDate } from "@/lib/staff-time";
import Alert from "../Alert";
import { DeleteTwice } from "../DeleteTwice";
import Bubble from "./Bubble";
import ChoiceSearch from "./ChoiceSearch";
import CopyButton from "./CopyButton";
import Menu from "./Menu";
import StaffLink from "./StaffLink";
import styles from "./SavedFilters.module.css";

const copy = staffCopy.filters.saved;

/** What the saved filters' forms do (app/(staff)/staff/saved-filter-actions.ts), which the page hands in. */
export type SavedFilterActions = Record<
  "save" | "update" | "rename" | "remove",
  (form: FormData) => void | Promise<void>
>;

type Row = {
  id: number;
  name: string;
  /** What it filters by, in words. */
  summary: string;
  /** The address before the @ of who made it, and the day. */
  by: string;
  date: string;
  /** Its link for this page, and to share. */
  href: string;
  link: string;
};

export type SavedFiltersProps = {
  list: SavedList;
  rows: Row[];
  loaded?: { id: number; name: string; edited: boolean; undo: string };
  /** The name a new one starts with. */
  name: string;
  /** This page's URL, as the forms send it, for where to come back to. */
  back: string;
  /** Changes when any filter does, so a menu open over one closes. */
  version: string;
  /** The loaded filter's values that no longer exist, each "<parameter>=<value>". */
  gone: string[];
  actions: SavedFilterActions;
};

/** What a list's filters component gives FilterBar for its saved filters, from what the server found. */
export function savedFiltersProps({
  list,
  state,
  values,
  path,
  name,
  summary,
  actions,
}: {
  list: SavedList;
  state: SavedFiltersState;
  values: Params;
  path: string;
  name: string;
  summary: (params: Params) => string[];
  actions: SavedFilterActions;
}): SavedFiltersProps {
  const carried = carriedParams(values);
  const { rows, loaded } = state;
  return {
    list,
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      summary: summary(row.params).filter(Boolean).join(" · "),
      by: row.createdBy.split("@")[0],
      date: staffDate(row.createdAt),
      href: savedFilterHref(list, row.id, row.params, carried),
      link: savedFilterHref(list, row.id, row.params),
    })),
    loaded: loaded && {
      id: loaded.id,
      name: loaded.name,
      edited: loaded.edited,
      undo: savedFilterHref(list, loaded.id, loaded.params, carried),
    },
    name,
    back: filtersPath(path, values),
    version: JSON.stringify(rows),
    gone: loaded?.gone ?? [],
    actions,
  };
}

/** The bookmark on the chip: outlined, or filled in the accent with a filter loaded. */
function Bookmark({ filled }: { filled: boolean }) {
  return (
    <svg
      className={filled ? `${styles.icon} ${styles.loaded}` : styles.icon}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}

/** A form's fields saying which filter it's about, and where to come back to. */
function FormFields({ list, id, back }: { list: SavedList; id?: number; back?: string }) {
  return (
    <>
      <input type="hidden" name="list" value={list} />
      {id !== undefined && <input type="hidden" name="id" value={id} />}
      {back !== undefined && <input type="hidden" name="back" value={back} />}
    </>
  );
}

/** The form that names a filter, in the bubble `bubble`, which Cancel closes. */
function NameForm({
  bubble,
  title,
  name,
  list,
  id,
  back,
  action,
}: {
  bubble: string;
  title: string;
  name: string;
  list: SavedList;
  id?: number;
  back?: string;
  action: (form: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className={styles.nameForm}>
      <FormFields list={list} id={id} back={back} />
      <p className={styles.heading}>{title}</p>
      <Field label={copy.name}>
        <TextArea name="name" defaultValue={name} rows={3} required />
      </Field>
      <p className={styles.hint}>{copy.shared}</p>
      <div className={styles.buttons}>
        <Button variant="ghost" size="small" fit type="button" popoverTarget={bubble} popoverTargetAction="hide">
          {copy.cancel}
        </Button>
        <SubmitButton variant="primary" size="small" fit>
          {copy.save}
        </SubmitButton>
      </div>
    </form>
  );
}

/** A row of the list: a link that loads it, and its menu, which works without loading it. */
function SavedRow({
  row,
  current,
  list,
  back,
  actions,
}: {
  row: Row;
  current: boolean;
  list: SavedList;
  back: string;
  actions: SavedFilterActions;
}) {
  const rename = `saved-filter-${row.id}-rename`;
  return (
    <li className={styles.row} data-name={row.name}>
      <StaffLink href={row.href} className={styles.rowLink} aria-current={current ? "true" : undefined}>
        <span className={styles.rowTop}>
          <span className={styles.rowName}>{row.name}</span>
          <span className={styles.rowBy}>
            {row.by} · {row.date}
          </span>
        </span>
        <span className={styles.summary}>{row.summary}</span>
      </StaffLink>
      <Menu id={`saved-filter-${row.id}`} trigger={styles.rowButton} name={copy.rowMenu(row.name)} label="⋯">
        <div className={styles.rowActions}>
          <Bubble
            id={rename}
            trigger={buttonClass({ variant: "ghost", size: "small", fit: true })}
            label={copy.rename}
            className={styles.wide}
          >
            <NameForm
              bubble={rename}
              title={copy.rename}
              name={row.name}
              list={list}
              id={row.id}
              action={actions.rename}
            />
          </Bubble>
          <CopyButton text={row.link} fromHere label={copy.copyLink} copied={copy.linkCopied} close={copy.closeNote} />
          <DeleteTwice
            name="id"
            value={String(row.id)}
            fields={{ list, back }}
            label={copy.deleteForEveryone}
            danger
            action={actions.remove}
          />
        </div>
      </Menu>
    </li>
  );
}

/** The chip's second half after an edit: its three choices. */
function EditedChoices({ props }: { props: SavedFiltersProps & { loaded: { id: number; undo: string } } }) {
  const { list, loaded, back, name, actions } = props;
  const bubble = "saved-filter-save-as-new";
  return (
    <div className={styles.choices}>
      <form action={actions.update}>
        <FormFields list={list} id={loaded.id} back={back} />
        <button type="submit" className={styles.choice}>
          {copy.update}
        </button>
      </form>
      <Bubble id={bubble} trigger={styles.choice} label={copy.saveAsNew} className={styles.wide}>
        <NameForm bubble={bubble} title={copy.saveTitle} name={name} list={list} back={back} action={actions.save} />
      </Bubble>
      <StaffLink href={loaded.undo} className={styles.choice}>
        {copy.undo}
      </StaffLink>
    </div>
  );
}

/**
 * A list's saved filters, shared by all who can open it (docs/style-guide.md,
 * "Filters"): a chip that opens the list of them, named for the one loaded, if
 * any. Its second half is there while there's something to save: Save, naming
 * a new one, or once one's been edited, a menu to update it for everyone, save
 * it as new, or undo the changes.
 */
export default function SavedFilters({ canSave, ...props }: SavedFiltersProps & { canSave: boolean }) {
  const { list, rows, loaded, name, back, actions } = props;
  const chooser = (
    <Menu
      id="saved-filters"
      wide
      trigger={`${styles.half} ${styles.menuHalf}`}
      label={
        <>
          <Bookmark filled={Boolean(loaded)} />
          <span className={styles.name} title={loaded?.name}>
            {loaded?.name ?? copy.chip}
          </span>
          {loaded?.edited && <span className={styles.edited}>{copy.edited}</span>}
        </>
      }
    >
      {rows.length ? (
        <>
          <ChoiceSearch label={copy.find} />
          <ul className={styles.rows}>
            {rows.map((row) => (
              <SavedRow
                key={row.id}
                row={row}
                current={row.id === loaded?.id}
                list={list}
                back={back}
                actions={actions}
              />
            ))}
          </ul>
          <p className={styles.count}>{copy.count(rows.length)}</p>
        </>
      ) : (
        <p className={styles.empty}>{copy.none}</p>
      )}
    </Menu>
  );
  if (loaded?.edited) {
    return (
      <span className={styles.chip} role="group" aria-label={copy.chip}>
        {chooser}
        <Menu id="saved-filter-save" trigger={`${styles.half} ${styles.menuHalf} ${styles.save}`} label={copy.save}>
          <EditedChoices props={{ ...props, loaded }} />
        </Menu>
      </span>
    );
  }
  if (canSave && !loaded) {
    const bubble = "saved-filter-save";
    return (
      <span className={styles.chip} role="group" aria-label={copy.chip}>
        {chooser}
        <Bubble id={bubble} trigger={`${styles.half} ${styles.save}`} label={copy.save} className={styles.wide}>
          <NameForm bubble={bubble} title={copy.saveTitle} name={name} list={list} back={back} action={actions.save} />
        </Bubble>
      </span>
    );
  }
  return <span className={styles.chip}>{chooser}</span>;
}

/**
 * Says what a loaded saved filter names that no longer exists, in `words`,
 * and has been left out: Update takes it out for good, or it can be deleted.
 * Nothing for one with nothing gone.
 */
export function SavedFilterGone({ words, saved }: { words: string[]; saved: SavedFiltersProps }) {
  if (!words.length) return null;
  const { list, back, actions } = saved;
  const loaded = saved.loaded!;
  return (
    <Alert tone="amber">
      {copy.gone(words.join(", "))}
      <span className={styles.goneActions}>
        <form action={actions.update}>
          <FormFields list={list} id={loaded.id} back={loaded.undo} />
          <SubmitButton variant="ghost" size="small" fit>
            {copy.goneUpdate}
          </SubmitButton>
        </form>
        <DeleteTwice
          name="id"
          value={String(loaded.id)}
          fields={{ list, back }}
          label={copy.goneDelete}
          action={actions.remove}
        />
      </span>
    </Alert>
  );
}
