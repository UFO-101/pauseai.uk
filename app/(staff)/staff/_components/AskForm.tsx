"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Select, TextInput } from "@/components/ui/Controls";
import { Field, FieldSet, Hint } from "@/components/ui/Field";
import { FormStack } from "@/components/ui/Form";
import { ASK_STATUSES, ASKERS, type Asker } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import { DeleteTwice } from "./MailingButtons";
import Strip from "./ui/Strip";

const copy = staffCopy.asks;

/** An ask to edit, with whether the code names it, its kind can change, and it can be deleted. */
export type EditableAsk = Ask & { fixed: boolean; kindFixed: boolean; deletable: boolean };

type FormAction = (form: FormData) => void | Promise<void>;

/**
 * Adding an ask, or editing `ask`: its title, kind, date, link and who
 * asks it, then Save, which goes back to `back`. Its slug is said, not
 * changed. Its kind is fixed once politicians have answered it, and an ask
 * the code names can't be changed at all. Under it, Delete, pressed
 * twice, while nothing refers to it. `notice` says how the last
 * save or delete went.
 */
export default function AskForm({
  ask,
  back,
  notice,
  save,
  remove,
}: {
  ask: EditableAsk | null;
  back: string;
  notice: string;
  save: FormAction;
  remove: FormAction;
}) {
  const [askedBy, setAskedBy] = useState<Asker[]>(ask?.askedBy ?? ["pauseai"]);
  const fixed = Boolean(ask?.fixed);
  return (
    <>
      {copy.notices[notice] && (
        <Strip tone={notice === "added" || notice === "saved" ? "green" : "amber"} announce>
          {copy.notices[notice]}
        </Strip>
      )}
      {fixed && <Strip tone="amber">{copy.fixed}</Strip>}
      <FormStack action={save}>
        <input type="hidden" name="back" value={back} />
        {ask && <input type="hidden" name="slug" value={ask.slug} />}
        <Field label={copy.fields.title}>
          <TextInput name="title" required defaultValue={ask?.title} disabled={fixed} />
        </Field>
        {ask && <Hint>{copy.slugHint(ask.slug)}</Hint>}
        <Field label={copy.fields.kind}>
          <Select name="kind" required defaultValue={ask?.kind ?? ""} disabled={fixed || ask?.kindFixed}>
            <option value="" disabled>
              {staffCopy.mailingPages.choose}
            </option>
            {Object.keys(ASK_STATUSES).map((kind) => (
              <option key={kind} value={kind}>
                {copy.kinds[kind]}
              </option>
            ))}
          </Select>
        </Field>
        {/* A disabled select sends nothing, so its kind goes as it is. */}
        {ask?.kindFixed && <input type="hidden" name="kind" value={ask.kind} />}
        {ask?.kindFixed && !fixed && <Hint>{copy.kindFixed}</Hint>}
        <Field label={copy.fields.date}>
          <TextInput name="date" type="date" defaultValue={ask?.date ?? ""} disabled={fixed} />
        </Field>
        <Field label={copy.fields.url}>
          <TextInput name="url" defaultValue={ask?.url ?? ""} disabled={fixed} />
        </Field>
        <Hint>{copy.urlHint}</Hint>
        <FieldSet label={copy.fields.askedBy}>
          {ASKERS.map((asker) => (
            <Checkbox
              key={asker}
              name="askedBy"
              checked={askedBy.includes(asker)}
              disabled={fixed}
              onChange={(on) => setAskedBy(on ? [...askedBy, asker] : askedBy.filter((one) => one !== asker))}
            >
              {copy.askedBy[asker]}
            </Checkbox>
          ))}
        </FieldSet>
        <Button type="submit" variant="primary" fit disabled={fixed}>
          {copy.save}
        </Button>
      </FormStack>
      {ask && !fixed && (
        <div>
          <DeleteTwice name="slug" value={ask.slug} label={copy.delete} disabled={!ask.deletable} action={remove} />
          {!ask.deletable && <Hint>{copy.notDeletable}</Hint>}
        </div>
      )}
    </>
  );
}
