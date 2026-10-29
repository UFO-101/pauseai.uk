"use client";

import { useState } from "react";
import Actions from "@/components/ui/Actions";
import { Button } from "@/components/ui/Button";
import { Checkbox, Select, TextInput } from "@/components/ui/Controls";
import { Field, FieldSet, Hint } from "@/components/ui/Field";
import { FormStack } from "@/components/ui/Form";
import { ASK_STATUSES, ASKERS, type AskKind, type Asker } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import { AskPreview } from "./AskLine";
import { DeleteTwice } from "./MailingButtons";
import Grid, { Card } from "./ui/Grid";
import Strip from "./ui/Strip";
import forms from "./StaffForms.module.css";

const copy = staffCopy.asks;

/** An ask to edit, with whether the code names it, its kind can change, and it can be deleted. */
export type EditableAsk = Ask & { fixed: boolean; kindFixed: boolean; deletable: boolean };

type FormAction = (form: FormData) => void | Promise<void>;

/**
 * Adding an ask, or editing `ask`, beside it as it will show on a
 * politician's page, changing as it's typed. The kind comes first, and the
 * rest is asked in its words: which letter or event, an example of how to
 * name it, when, and where to find it; then who asks. Under it, Save,
 * which goes back to `back`, and beside it Delete, pressed twice, only
 * while nothing refers to the ask. Its slug is said, not changed; its kind
 * is fixed once politicians have answered it, and an ask the code names
 * can't be changed at all. `notice` says how the last save or delete went.
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
  const [kind, setKind] = useState(ask?.kind ?? "letter");
  const [title, setTitle] = useState(ask?.title ?? "");
  const [date, setDate] = useState(ask?.date ?? "");
  const [url, setUrl] = useState(ask?.url ?? "");
  const [askedBy, setAskedBy] = useState<Asker[]>(ask?.askedBy ?? ["pauseai"]);
  const fixed = Boolean(ask?.fixed);
  const words = copy.byKind[kind];
  return (
    <>
      {copy.notices[notice] && (
        <Strip tone={notice === "added" || notice === "saved" ? "green" : "amber"} announce>
          {copy.notices[notice]}
        </Strip>
      )}
      {fixed && <Strip tone="amber">{copy.fixed}</Strip>}
      <Grid>
        <Card span={3}>
          <FormStack id="ask-form" action={save}>
            <input type="hidden" name="back" value={back} />
            {ask && <input type="hidden" name="slug" value={ask.slug} />}
            <Field label={copy.fields.kind} className={forms.short}>
              <Select
                name="kind"
                required
                value={kind}
                onChange={(event) => setKind(event.target.value as AskKind)}
                disabled={fixed || ask?.kindFixed}
              >
                {Object.keys(ASK_STATUSES).map((one) => (
                  <option key={one} value={one}>
                    {copy.kinds[one]}
                  </option>
                ))}
              </Select>
            </Field>
            {/* A disabled select sends nothing, so its kind goes as it is. */}
            {ask?.kindFixed && <input type="hidden" name="kind" value={ask.kind} />}
            {ask?.kindFixed && !fixed && <Hint>{copy.kindFixed}</Hint>}
            <Field label={words.title}>
              <TextInput
                name="title"
                required
                value={title}
                placeholder={words.titleExample}
                onChange={(event) => setTitle(event.target.value)}
                disabled={fixed}
              />
            </Field>
            <Hint>{words.titleHint}</Hint>
            {ask && <Hint>{copy.slugHint(ask.slug)}</Hint>}
            <Field label={words.date} className={forms.short}>
              <TextInput
                name="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={fixed}
              />
            </Field>
            <Field label={words.url}>
              <TextInput name="url" value={url} onChange={(event) => setUrl(event.target.value)} disabled={fixed} />
            </Field>
            <FieldSet label={copy.fields.askedBy}>
              {ASKERS.map((asker) => (
                <Checkbox
                  key={asker}
                  name="askedBy"
                  value={asker}
                  checked={askedBy.includes(asker)}
                  disabled={fixed}
                  onChange={(on) => setAskedBy(on ? [...askedBy, asker] : askedBy.filter((one) => one !== asker))}
                >
                  {copy.askedBy[asker]}
                </Checkbox>
              ))}
            </FieldSet>
          </FormStack>
          {!fixed && (
            <Actions>
              <Button type="submit" form="ask-form" variant="primary" fit>
                {copy.save}
              </Button>
              {ask?.deletable && <DeleteTwice name="slug" value={ask.slug} label={copy.delete} action={remove} />}
            </Actions>
          )}
          {ask && !fixed && !ask.deletable && <Hint>{copy.notDeletable}</Hint>}
        </Card>
        <Card span={3} look="aside" title={copy.previewTitle} id="ask-preview">
          <AskPreview
            ask={{
              slug: ask?.slug ?? "",
              kind,
              title: title || words.titleExample,
              date: date || null,
              url: url || null,
              askedBy,
            }}
          />
        </Card>
      </Grid>
    </>
  );
}
