"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Segmented, TextInput } from "@/components/ui/Controls";
import { FilterForm } from "@/components/ui/Form";
import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import { answeredByHand } from "@/lib/email-your-mp";
import type { Ask } from "@/lib/server/asks";
import type { Politician } from "@/lib/server/politicians";
import { staffDate } from "@/lib/staff-time";
import { AskLead } from "./AskLine";
import { BubbleBox } from "./ui/Bubble";
import { bubbleTrigger } from "./ui/bubble-trigger";
import Menu from "./ui/Menu";
import styles from "./Details.module.css";

const copy = staffCopy.politician;

type SetStatus = (form: FormData) => void | Promise<void>;

/**
 * Setting their answer to an ask staff record, with a note: one of the
 * answers its kind allows (ASK_STATUSES), all of them in a row to pick from,
 * and Save, which sends the one picked. Once there's an answer, no answer is
 * one to pick too, set apart from the rest, to clear it.
 */
function AnswerForm({ politician, ask, setStatus }: { politician: Politician; ask: Ask; setStatus: SetStatus }) {
  const current = politician.statuses[ask.slug]?.status ?? "";
  const [chosen, setChosen] = useState<string>(current);
  return (
    <FilterForm action={setStatus} aria-label={`${copy.setStatus}: ${ask.title}`}>
      <input type="hidden" name="politicianId" value={politician.id} />
      <input type="hidden" name="ask" value={ask.slug} />
      <span className={styles.statusChoices}>
        <Segmented
          label={copy.status}
          options={[
            ...ASK_STATUSES[ask.kind].map((value) => ({ value: value as string, label: staffCopy.statuses[value] })),
            ...(current ? [{ value: "", label: copy.clearAnswer, quiet: true }] : []),
          ]}
          value={chosen}
          onChange={setChosen}
        />
      </span>
      <label className={styles.note}>
        <span className={styles.noteLabel}>{copy.note}</span>
        <TextInput name="note" placeholder={copy.notePlaceholder} required />
      </label>
      <SubmitButton variant="primary" size="small" name="status" value={chosen} disabled={!chosen && !current}>
        {copy.save}
      </SubmitButton>
    </FilterForm>
  );
}

/** Ask rows, each its words in one column and its answer in the next, lined up from row to row: a politician's asks, or a letter's. */
export function AskRows({ children }: { children: ReactNode }) {
  return <div className={styles.asks}>{children}</div>;
}

/** Answers that are a yes, ticked in green, and a no, crossed. */
const YES = ["signed", "going"];
const NO = ["declined", "declined_surgery"];

/**
 * One ask, a row of the asks card: who asked them to do what, and when,
 * leading into the ask's title; the note and who set the answer, or which
 * import; beside it, in a column of its own, their answer and its date, a
 * yes ticked in green and a no crossed, and for an ask staff record, Edit
 * under it, which opens the form to change it in a bubble below. `open`
 * opens it at once, scrolled to, for an ask just added to the card, and `onClose` is
 * told when it closes.
 */
export default function AskRow({
  politician,
  ask,
  setStatus,
  open = false,
  onClose,
}: {
  politician: Politician;
  ask: Ask;
  setStatus: SetStatus;
  open?: boolean;
  onClose?: () => void;
}) {
  const status = politician.statuses[ask.slug];
  const byHand = answeredByHand(ask.slug);
  const editId = `edit-${ask.slug}`;
  const tone = status && (YES.includes(status.status) ? styles.yes : NO.includes(status.status) ? styles.no : "");
  const popover = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // On the page, the row, then its bubble under it, as much as fits with the row's top in view (BubbleBox's keep).
    row.current!.scrollIntoView({ block: "nearest" });
    popover.current!.showPopover();
  }, [open]);
  useEffect(() => {
    const bubble = popover.current;
    if (!bubble || !onClose) return;
    const closed = (event: Event) => {
      if ((event as ToggleEvent).newState === "closed") onClose();
    };
    bubble.addEventListener("toggle", closed);
    return () => bubble.removeEventListener("toggle", closed);
  }, [onClose]);
  return (
    <div
      ref={row}
      className={styles.ask}
      role="group"
      aria-label={ask.title}
      // What its bubble opens under on a phone (Details.module.css).
      style={{ anchorName: `--row-${ask.slug}`, "--row-anchor": `--row-${ask.slug}` } as CSSProperties}
    >
      <div className={styles.asked}>
        <AskLead ask={ask} />
        {status && (
          <span className={styles.askMeta}>
            {status.note && `${status.note} · `}
            {copy.fromImport[status.updatedBy] ?? copy.setBy(status.updatedBy, staffDate(status.updatedAt))}
          </span>
        )}
      </div>
      <div className={`${styles.answer} ${tone || ""}`}>
        <span>{status ? staffCopy.statuses[status.status] : staffCopy.statuses.noAnswer}</span>
        {status?.date && <span className={styles.askMeta}>{staffDate(status.date)}</span>}
        {byHand && (
          <button type="button" className={styles.edit} {...bubbleTrigger(editId)}>
            {copy.edit}
          </button>
        )}
      </div>
      {byHand && (
        // Keyed on the answer, so a change made from it closes it and empties the note.
        <BubbleBox
          key={status?.updatedAt ?? "none"}
          ref={popover}
          keep={row}
          id={editId}
          className={styles.editPopover}
        >
          <AnswerForm politician={politician} ask={ask} setStatus={setStatus} />
        </BubbleBox>
      )}
    </div>
  );
}

/**
 * A politician's asks card: a row for each ask they've answered, then under
 * them a small button whose menu lists the other asks staff record by hand.
 * One chosen joins the rows in its place, as the asks are ordered, with no
 * answer and its form open; closed unanswered, it's back in the menu at
 * once. Once answered, it's one of theirs, and if its answer is cleared,
 * it's back in the menu.
 */
export function PoliticianAsks({
  politician,
  asks,
  setStatus,
}: {
  politician: Politician;
  asks: Ask[];
  setStatus: SetStatus;
}) {
  const [added, setAdded] = useState<string[]>([]);
  const answered = (ask: Ask) => Boolean(politician.statuses[ask.slug]);
  // One answered is a row of its own now, so it's no longer one added here.
  const still = added.filter((slug) => asks.some((ask) => ask.slug === slug && !answered(ask)));
  if (still.length < added.length) setAdded(still);
  const rows = asks.filter((ask) => answered(ask) || added.includes(ask.slug));
  const left = asks.filter((ask) => answeredByHand(ask.slug) && !rows.includes(ask));
  return (
    <AskRows>
      {rows.map((ask) => (
        <AskRow
          key={ask.slug}
          politician={politician}
          ask={ask}
          setStatus={setStatus}
          open={!answered(ask)}
          onClose={answered(ask) ? undefined : () => setAdded((now) => now.filter((slug) => slug !== ask.slug))}
        />
      ))}
      {left.length > 0 && (
        <div className={styles.otherAsks}>
          <Menu
            id="other-asks"
            trigger={buttonClass({ variant: "ghost", size: "small", fit: true })}
            label={copy.otherAsk}
          >
            <ul className={styles.askChoices} aria-label={copy.otherAsk}>
              {left.map((ask) => (
                <li key={ask.slug}>
                  <button
                    type="button"
                    popoverTarget="other-asks"
                    popoverTargetAction="hide"
                    onClick={() => setAdded([...added, ask.slug])}
                  >
                    {ask.title}
                  </button>
                </li>
              ))}
            </ul>
          </Menu>
        </div>
      )}
    </AskRows>
  );
}
