"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Select, TextInput } from "@/components/ui/Controls";
import { FilterForm } from "@/components/ui/Form";
import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import { answeredByHand } from "@/lib/email-your-mp";
import type { Ask } from "@/lib/server/asks";
import type { Politician } from "@/lib/server/politicians";
import { staffDate } from "@/lib/staff-time";
import { AskLead } from "./AskLine";
import Menu from "./ui/Menu";
import styles from "./Details.module.css";

const copy = staffCopy.politician;

type SetStatus = (form: FormData) => void | Promise<void>;

/**
 * Setting their answer to an ask staff record, with a note: Signed, or
 * taking it away, for a letter; one of an event's answers, or none.
 */
function AnswerForm({ politician, ask, setStatus }: { politician: Politician; ask: Ask; setStatus: SetStatus }) {
  const status = politician.statuses[ask.slug];
  const note = (
    <span className={styles.note}>
      <TextInput name="note" aria-label={copy.note} placeholder={copy.notePlaceholder} required />
    </span>
  );
  return (
    <FilterForm action={setStatus} aria-label={`${copy.setStatus}: ${ask.title}`}>
      <input type="hidden" name="politicianId" value={politician.id} />
      <input type="hidden" name="ask" value={ask.slug} />
      {ask.kind === "letter" ? (
        <>
          <input type="hidden" name="status" value={status ? "" : "signed"} />
          {note}
          <SubmitButton variant={status ? "ghost" : "primary"} size="small">
            {status ? staffCopy.politicians.unmarkSigned : staffCopy.politicians.markSigned}
          </SubmitButton>
        </>
      ) : (
        <>
          <Select name="status" defaultValue={status?.status ?? ""} aria-label={copy.status}>
            <option value="">{staffCopy.statuses.noAnswer}</option>
            {ASK_STATUSES.event.map((value) => (
              <option key={value} value={value}>
                {staffCopy.statuses[value]}
              </option>
            ))}
          </Select>
          {note}
          <SubmitButton variant="primary" size="small">
            {copy.save}
          </SubmitButton>
        </>
      )}
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
 * opens it at once, for an ask just added to the card.
 */
export default function AskRow({
  politician,
  ask,
  setStatus,
  open = false,
}: {
  politician: Politician;
  ask: Ask;
  setStatus: SetStatus;
  open?: boolean;
}) {
  const status = politician.statuses[ask.slug];
  const none = ask.kind === "letter" ? staffCopy.statuses.none : staffCopy.statuses.noAnswer;
  const byHand = answeredByHand(ask.slug);
  const editId = `edit-${ask.slug}`;
  const tone = status && (YES.includes(status.status) ? styles.yes : NO.includes(status.status) ? styles.no : "");
  const popover = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) popover.current!.showPopover();
  }, [open]);
  return (
    <div className={styles.ask} role="group" aria-label={ask.title}>
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
        <span>{status ? staffCopy.statuses[status.status] : none}</span>
        {status?.date && <span className={styles.askMeta}>{staffDate(status.date)}</span>}
        {byHand && (
          <button
            type="button"
            className={styles.edit}
            popoverTarget={editId}
            style={{ anchorName: `--${editId}` } as CSSProperties}
          >
            {copy.edit}
          </button>
        )}
      </div>
      {byHand && (
        // Keyed on the answer, so a change made from it closes it and empties the note.
        <div
          key={status?.updatedAt ?? "none"}
          ref={popover}
          id={editId}
          popover="auto"
          className={styles.editPopover}
          style={{ positionAnchor: `--${editId}` } as CSSProperties}
        >
          <AnswerForm politician={politician} ask={ask} setStatus={setStatus} />
        </div>
      )}
    </div>
  );
}

/**
 * Under the asks card's rows: a small button whose menu lists the other
 * asks staff record by hand. One chosen joins the rows, with no answer and
 * its form open; once answered, the page has it as a row of its own.
 */
export function OtherAsks({
  politician,
  asks,
  setStatus,
}: {
  politician: Politician;
  asks: Ask[];
  setStatus: SetStatus;
}) {
  const [added, setAdded] = useState<string[]>([]);
  const rows = asks.filter((ask) => added.includes(ask.slug));
  const left = asks.filter((ask) => !added.includes(ask.slug));
  return (
    <>
      {rows.map((ask) => (
        <AskRow key={ask.slug} politician={politician} ask={ask} setStatus={setStatus} open />
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
    </>
  );
}
