"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Select, TextInput } from "@/components/ui/Controls";
import { FilterForm } from "@/components/ui/Form";
import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import type { Politician } from "@/lib/server/politicians";
import styles from "./Details.module.css";

const copy = staffCopy.politician;

/**
 * Setting a politician's answer to an ask staff record, with a note: Signed,
 * or taking it away, for a letter; one of an event's answers, or none.
 * With `menu`, it's the form for the ask chosen from a menu of `asks`;
 * without, the form for the first.
 */
export default function AnswerForm({
  politician,
  asks,
  menu = false,
  setStatus,
}: {
  politician: Pick<Politician, "id" | "statuses">;
  asks: Ask[];
  menu?: boolean;
  setStatus: (form: FormData) => void | Promise<void>;
}) {
  const [chosen, choose] = useState("");
  const ask = menu ? asks.find((a) => a.slug === chosen) : asks[0];
  return (
    <>
      {menu && (
        <Select value={ask?.slug ?? ""} onChange={(e) => choose(e.target.value)} aria-label={copy.otherAsk}>
          <option value="">{copy.otherAsk}</option>
          {asks.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.title}
            </option>
          ))}
        </Select>
      )}
      {ask && (
        <Answer politicianId={politician.id} status={politician.statuses[ask.slug]} ask={ask} setStatus={setStatus} />
      )}
    </>
  );
}

function Answer({
  politicianId,
  status,
  ask,
  setStatus,
}: {
  politicianId: number;
  status: Politician["statuses"][string];
  ask: Ask;
  setStatus: (form: FormData) => void | Promise<void>;
}) {
  const note = (
    <span className={styles.note}>
      <TextInput name="note" aria-label={copy.note} placeholder={copy.notePlaceholder} required />
    </span>
  );
  return (
    <FilterForm action={setStatus} aria-label={`${copy.setStatus}: ${ask.title}`}>
      <input type="hidden" name="politicianId" value={politicianId} />
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
