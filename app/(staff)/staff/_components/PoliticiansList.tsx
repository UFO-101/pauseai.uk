import type { ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import type { Choosing } from "@/lib/server/mailing-drafts";
import type { Pasted, Politician, PoliticiansPage, PoliticiansSearch } from "@/lib/server/politicians";
import { filtersPath, pageParam, storedFilter, valuesOf, type Params } from "@/lib/staff-search";
import PasteForm from "./PasteForm";
import PickBox from "./PickBox";
import PoliticianTable, { politicianColumns } from "./PoliticianTable";
import styles from "./PoliticiansList.module.css";
import Bubble from "./ui/Bubble";
import ListFrame, { ListTable, type ListColumn } from "./ui/ListFrame";
import Strip from "./ui/Strip";
import Tabs from "./ui/Tabs";
import StaffLink from "./ui/StaffLink";

const PATH = "/staff/politicians";
const copy = staffCopy.politicians;
const mailingCopy = staffCopy.mailingPages;

/**
 * The houses, as tabs over the list, each keeping the other filters and the
 * sort, from the first page; and, while choosing who a mailing is for, a
 * tab of only those ticked, and after a paste, one of who the names found.
 */
export function HouseTabs({ search, choosing }: { search: PoliticiansSearch; choosing?: Choosing }) {
  const filters = { ...search, page: "", tab: "" };
  const tabs = [
    { key: "", label: copy.allHouses, href: filtersPath(PATH, filters, { house: "" }) },
    ...Object.entries(staffCopy.houses).map(([house, label]) => ({
      key: house,
      label,
      href: filtersPath(PATH, filters, { house }),
    })),
    ...(choosing
      ? [
          {
            key: "ticked",
            label: mailingCopy.pickedTab,
            badge: choosing.ticked.length,
            href: filtersPath(PATH, filters, { tab: "ticked" }),
          },
        ]
      : []),
    ...(choosing && search.pasted.length
      ? [{ key: "pasted", label: mailingCopy.pastedTab, href: filtersPath(PATH, filters, { tab: "pasted" }) }]
      : []),
  ];
  const house = Object.hasOwn(staffCopy.houses, search.house) ? search.house : "";
  return <Tabs label={staffCopy.fields.house} tabs={tabs} current={(choosing && search.tab) || house} />;
}

/** A form's action, as a Server Action takes it. */
type FormAction = (form: FormData) => Promise<void>;

/** What choosing who a mailing is for does (app/(staff)/staff/mailing-actions.ts), which the page hands in. */
export type ChoosingActions = {
  /** Ticks a politician for the draft, or unticks them. */
  pick: (mailing: number, politician: number, ticked: boolean) => Promise<void>;
  /** Ticks everyone the list's parameters find, or unticks them. */
  pickFound: (mailing: number, params: Params, ticked: boolean) => Promise<void>;
  /** Goes to the paste tab, with the names pasted. */
  paste: FormAction;
  /** Ticks these, everyone a paste found, or unticks them. */
  pickMany: (mailing: number, politicians: number[], ticked: boolean) => Promise<void>;
  /** Unticks everyone, to start again. */
  untickAll: (mailing: number) => Promise<void>;
};

/**
 * The page (`children`), and over it, while the list is choosing who a
 * mailing is for, a strip saying what to do, for a new mailing or for the
 * draft by its title; for a new one, the way out, Cancel, deleting it. A
 * draft's way back is the bar at the foot, as its ticks are saved as
 * they're made. The strip is held at the top of the window as the
 * page scrolls, so what's being done, and how to stop, stay in sight. It's
 * held inside a plain box around the whole page, which is the page's first
 * element: the router scrolls a new page's first element into view, and a
 * held one, at the top, it scrolls the page past.
 */
export function ChoosingHead({
  choosing,
  cancel,
  children,
}: {
  choosing?: Choosing;
  cancel: FormAction;
  children: ReactNode;
}) {
  if (!choosing) return children;
  return (
    <div>
      <div className={styles.held}>
        <Strip
          tone="dark"
          action={
            choosing.blank && (
              <form action={cancel}>
                <input type="hidden" name="id" value={choosing.id} />
                <button type="submit" className={styles.cancel}>
                  {mailingCopy.cancelNew}
                </button>
              </form>
            )
          }
        >
          <span>{choosing.blank ? mailingCopy.choosingNew : mailingCopy.choosingDraft(choosing.title)}</span>
          <span className={styles.how}>{choosing.blank ? mailingCopy.choosingHowNew : mailingCopy.choosingHow}</span>
        </Strip>
      </div>
      {children}
    </div>
  );
}

/**
 * The bar at the foot of the window while the list is choosing who a
 * mailing is for: how many are ticked, with light buttons to see them and
 * to untick everyone, Paste names, whose box opens above it, and the
 * orange one on to the draft; a draft's, with
 * no one ticked, back to it, as ticks are saved as they're made. A new
 * mailing's is greyed till someone's ticked: its way out is Cancel, at the
 * top. It stays in sight as the list scrolls, so the way on is always there.
 */
function ChoosingBar({
  choosing,
  search,
  actions,
}: {
  choosing: Choosing;
  search: PoliticiansSearch;
  actions: ChoosingActions;
}) {
  const n = choosing.ticked.length;
  return (
    <div className={styles.bar} role="region" aria-label={mailingCopy.choosingCount(n)}>
      <div className={styles.barStart}>
        <span className={styles.count}>{n ? mailingCopy.choosingCount(n) : mailingCopy.noneTicked}</span>
        {n > 0 && search.tab !== "ticked" && (
          <StaffLink
            className={buttonClass({ variant: "ghost", size: "small", fit: true, className: styles.onDark })}
            href={filtersPath(PATH, { ...search, page: "" }, { tab: "ticked" })}
          >
            {mailingCopy.seeTicked}
          </StaffLink>
        )}
        {n > 0 && (
          <form action={actions.untickAll.bind(null, choosing.id)}>
            <SubmitButton variant="ghost" size="small" fit className={styles.onDark}>
              {mailingCopy.untickAll}
            </SubmitButton>
          </form>
        )}
        <Bubble
          id="paste-names"
          above
          trigger={buttonClass({ variant: "primary", size: "small", fit: true })}
          label={mailingCopy.pasteNames}
          className={styles.pasteBubble}
        >
          <PasteForm
            action={actions.paste}
            back={filtersPath(PATH, { ...search, pasted: [], tab: "" })}
            className={styles.paste}
          />
        </Bubble>
      </div>
      {/* A new mailing with no one ticked has it greyed, so the bar is the same either way. */}
      {n === 0 && choosing.blank ? (
        <Button variant="primary" fit disabled>
          {mailingCopy.writeToNone}
        </Button>
      ) : (
        <StaffLink className={buttonClass({ variant: "primary", fit: true })} href={`/staff/mailings/${choosing.id}`}>
          {choosing.blank ? mailingCopy.writeToThese(n) : n ? mailingCopy.useThese(n) : mailingCopy.backToDraft}
        </StaffLink>
      )}
    </div>
  );
}

/** A line of names pasted, and who it found (findPasted), or those it might be. */
export type PastedLine = Pasted & { line: string };

/** A row of the paste tab's table: someone a line found, and why. */
type PastedRow = { key: string; line: string; one: Politician; why: string };

/** Each line pasted as rows, one for each person it found. */
function pastedRows(lines: PastedLine[]): PastedRow[] {
  return lines.flatMap(({ line, matches, by, choices, near }, i) => {
    // As a row copied from a table has it, with its cells' tabs as dots.
    const said = line.replace(/\s*\t\s*/g, " · ");
    const found = [
      ...matches.map((one) => ({ one, why: mailingCopy.pastedBy[by[one.id]] })),
      ...choices.map((one) => ({ one, why: near ? mailingCopy.pastedNone : mailingCopy.pastedSome })),
    ];
    return found.map(({ one, why }) => ({ key: `${i}-${one.id}`, line: said, one, why }));
  });
}

/**
 * The paste tab, after a paste (Paste names, in the bar at the foot): the
 * politicians list's table, a row for each person each line found, with
 * their tick box, unticked till they're ticked here, and last the reason
 * they're there (by their name, more than one match, or only near it) and
 * the line. Lines that found no one are only counted, under it; if none
 * found anyone, it says only that. The box
 * over them ticks everyone found.
 */
function PasteTab({
  lines,
  skipped,
  choosing,
  asks,
  actions,
}: {
  lines: PastedLine[];
  skipped: number;
  choosing: Choosing;
  asks: Ask[];
  actions: ChoosingActions;
}) {
  const ticked = new Set(choosing.ticked);
  const rows = pastedRows(lines);
  // Everyone the paste found, once each, for the box over them.
  const found = [...new Set(rows.map(({ one }) => one.id))];
  const all = found.length > 0 && found.every((id) => ticked.has(id));
  // The politicians list's columns, with no sorting, as this is its own table, and no status, as they're all in office.
  const theirs: ListColumn<PastedRow>[] = politicianColumns(asks, { status: "" }).map((column) => ({
    ...column,
    heading: undefined,
    text: undefined,
    cell: ({ one }) => column.cell(one),
  }));
  const columns: ListColumn<PastedRow>[] = [
    {
      key: "tick",
      label: mailingCopy.pastedTickAll(found.length),
      heading: (
        <th key="tick" className={styles.tick}>
          <PickBox
            ticked={all}
            some={!all && found.some((id) => ticked.has(id))}
            label={mailingCopy.pastedTickAll(found.length)}
            action={actions.pickMany.bind(null, choosing.id, found)}
          />
        </th>
      ),
      short: true,
      cell: ({ one }) => (
        <PickBox
          ticked={ticked.has(one.id)}
          label={mailingCopy.tick(one.name)}
          action={actions.pick.bind(null, choosing.id, one.id)}
        />
      ),
    },
    ...theirs,
    {
      key: "reason",
      label: mailingCopy.pastedFound,
      cell: ({ why, line }) => (
        <>
          {why}
          <br />
          <Muted>“{line}”</Muted>
        </>
      ),
    },
  ];
  return (
    <section className={styles.pasted} aria-label={mailingCopy.pastedTitle}>
      {rows.length > 0 ? (
        <>
          <ListTable columns={columns} rows={rows} rowKey={(row) => row.key} />
          {skipped > 0 && (
            <p>
              <Muted>{mailingCopy.pastedSkipped(skipped)}</Muted>
            </p>
          )}
        </>
      ) : (
        <p>{mailingCopy.pastedNoOne}</p>
      )}
    </section>
  );
}

/**
 * The column of tick boxes while choosing who a mailing is for: a box for
 * each row, and in the heading one for everyone the filters find, on every
 * page, ticked when they all are and part ticked when some are. On the
 * ticked tab, where the filters don't apply, it's ticked, and unticks
 * everyone.
 */
function tickColumn(
  choosing: Choosing,
  search: PoliticiansSearch,
  total: number,
  tickedHere: number,
  actions: ChoosingActions,
): ListColumn<Politician> {
  const ticked = new Set(choosing.ticked);
  const all = total > 0 && tickedHere === total;
  return {
    key: "tick",
    label: mailingCopy.tickAll(total),
    short: true,
    heading: (
      <th key="tick" className={styles.tick}>
        {search.tab !== "ticked" ? (
          <PickBox
            ticked={all}
            some={!all && tickedHere > 0}
            label={mailingCopy.tickAll(total)}
            action={actions.pickFound.bind(null, choosing.id, storedFilter("politicians", search).params)}
          />
        ) : (
          <PickBox ticked label={mailingCopy.untickAll} action={actions.untickAll.bind(null, choosing.id)} />
        )}
      </th>
    ),
    cell: (p) => (
      <PickBox
        ticked={ticked.has(p.id)}
        label={mailingCopy.tick(p.name)}
        action={actions.pick.bind(null, choosing.id, p.id)}
      />
    ),
  };
}

/**
 * The politicians page's list, in the list frame: how many, New mailing, its
 * downloads, the table and the way through its pages; or, when a search
 * finds no one, the nearest names. Under it, how many the search finds in
 * other houses, out of office or among the test politicians, linked to
 * them; while choosing, the nearest names have tick boxes too. New
 * mailing makes one with everyone the filters find ticked, and
 * chooses for it. While choosing, each row has a tick box, New mailing
 * goes, and the bar at the foot goes on to the draft; the paste tab is in
 * place of the list. A new filter or sort starts
 * from the first page.
 */
export default function PoliticiansList({
  list,
  search,
  asks,
  newMailing,
  choosing,
  tickedHere = 0,
  pasted = [],
  skipped = 0,
  actions,
}: {
  list: PoliticiansPage;
  search: PoliticiansSearch;
  asks: Ask[];
  /** Makes a new mailing to everyone the form's filter finds (mailing-actions.ts). */
  newMailing: FormAction;
  /** The draft it's choosing for, how many of those the filters find are ticked, and the lines pasted. */
  choosing?: Choosing;
  tickedHere?: number;
  pasted?: PastedLine[];
  /** How many lines pasted found no one, and are left out. */
  skipped?: number;
  actions: ChoosingActions;
}) {
  const filters = { ...search, page: "" };
  const who = storedFilter("politicians", search).params;
  const columns = politicianColumns(asks, filters);
  if (choosing && search.tab === "pasted") {
    return (
      <>
        <PasteTab lines={pasted} skipped={skipped} choosing={choosing} asks={asks} actions={actions} />
        <ChoosingBar choosing={choosing} search={search} actions={actions} />
      </>
    );
  }
  return (
    <>
      {list.closest.length > 0 ? (
        <>
          <p>{copy.closest}</p>
          {choosing ? (
            // While choosing, each with its tick box, as the list's rows have; none over them, as the search found no one.
            <ListTable
              columns={[
                { ...tickColumn(choosing, search, 0, 0, actions), heading: <th key="tick" className={styles.tick} /> },
                ...columns,
              ]}
              rows={list.closest}
              rowKey={(p) => p.id}
            />
          ) : (
            <PoliticianTable politicians={list.closest} asks={asks} search={filters} />
          )}
        </>
      ) : (
        <ListFrame
          count={copy.total(list.total)}
          total={list.total}
          page={list.page}
          pages={list.pages}
          pageSize={list.pageSize}
          href={(n) => filtersPath(PATH, search, pageParam(n))}
          download={(format) => filtersPath(`${PATH}/download`, filters, { format })}
          actions={
            !choosing && (
              <form action={newMailing}>
                {Object.entries(who).flatMap(([name, value]) =>
                  valuesOf(value).map((one) => <input key={`${name}=${one}`} type="hidden" name={name} value={one} />),
                )}
                <input type="hidden" name="found" value="1" />
                <SubmitButton variant="primary" size="small" fit>
                  {mailingCopy.newTitle}
                </SubmitButton>
              </form>
            )
          }
          formats={["csv", "json", "vcf"]}
          columns={choosing ? [tickColumn(choosing, search, list.total, tickedHere, actions), ...columns] : columns}
          rows={list.politicians}
          rowKey={(p) => p.id}
          empty={search.tab === "ticked" ? mailingCopy.pickedNone : copy.none}
          // The ticked tab has no filter bar, so the tabs' rule is the one over it.
          ruled={search.tab !== "ticked"}
        />
      )}
      {list.otherHouses > 0 && (
        <p>
          <StaffLink href={filtersPath(PATH, filters, { house: "" })}>{copy.otherHouses(list.otherHouses)}</StaffLink>
        </p>
      )}
      {list.outOfOffice > 0 && (
        <p>
          <StaffLink href={filtersPath(PATH, filters, { status: "any" })}>
            {copy.outOfOffice(list.outOfOffice)}
          </StaffLink>
        </p>
      )}
      {list.tests > 0 && (
        <p>
          <StaffLink href={filtersPath(PATH, filters, { flag: "test" })}>{copy.tests(list.tests)}</StaffLink>
        </p>
      )}
      {choosing && <ChoosingBar choosing={choosing} search={search} actions={actions} />}
    </>
  );
}
