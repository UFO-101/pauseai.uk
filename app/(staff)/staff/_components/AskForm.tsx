"use client";

import { useState, type ReactNode } from "react";
import Actions from "@/components/ui/Actions";
import { Button } from "@/components/ui/Button";
import { Checkbox, Segmented, TextInput } from "@/components/ui/Controls";
import { Field, FieldError, FieldSet, Hint } from "@/components/ui/Field";
import { FormStack } from "@/components/ui/Form";
import { ASK_STATUSES, ASKERS, askSlug, type AskKind, type Asker } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import { AskPreview } from "./AskLine";
import { DeleteTwice } from "./MailingButtons";
import Grid, { Card } from "./ui/Grid";
import Strip from "./ui/Strip";
import styles from "./AskForm.module.css";
import forms from "./StaffForms.module.css";

const copy = staffCopy.asks;

/** Each kind's picture, in strokes of the text's colour: a pen on a page, a calendar. */
const KIND_ICONS: Record<AskKind, ReactNode> = {
  letter: (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M13 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
      <path d="M17.5 3.5l3 3L13 14l-3.5.5.5-3.5z" />
    </svg>
  ),
  event: (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="15" rx="1" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </svg>
  ),
};

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
  // A link that isn't a whole one, which the server would refuse (askFrom).
  const badLink = Boolean(url) && !url.startsWith("https://");
  return (
    <>
      {copy.notices[notice] && (
        <Strip tone={notice === "added" || notice === "saved" ? "green" : "amber"} announce>
          {copy.notices[notice]}
        </Strip>
      )}
      {fixed && <Strip tone="amber">{copy.fixed}</Strip>}
      <div className={styles.form}>
        <Grid>
          <Card span={3}>
            <FormStack id="ask-form" action={save}>
              <input type="hidden" name="back" value={back} />
              {ask && <input type="hidden" name="slug" value={ask.slug} />}
              <Field label={copy.fields.kind}>
                <Segmented
                  label={copy.fields.kind}
                  options={Object.keys(ASK_STATUSES).map((one) => ({
                    value: one as AskKind,
                    label: copy.kinds[one],
                    icon: KIND_ICONS[one as AskKind],
                  }))}
                  value={kind}
                  onChange={setKind}
                  disabled={fixed || ask?.kindFixed}
                />
              </Field>
              <input type="hidden" name="kind" value={kind} />
              {ask?.kindFixed && !fixed && <Hint>{copy.kindFixed}</Hint>}
              {/* The title, and under it the slug it gives a new ask, or an ask's own, which doesn't change. */}
              <div className={styles.titled}>
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
                {(ask || title.trim()) && (
                  <p className={styles.slug}>
                    <span>{copy.slugLabel}</span> <code>{ask ? ask.slug : askSlug(title, date || null)}</code>
                  </p>
                )}
              </div>
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
                <TextInput
                  name="url"
                  value={url}
                  placeholder="https://"
                  onChange={(event) => setUrl(event.target.value)}
                  disabled={fixed}
                  aria-invalid={badLink}
                  aria-describedby={badLink ? "ask-link-error" : undefined}
                />
              </Field>
              {badLink && <FieldError id="ask-link-error">{copy.badLink}</FieldError>}
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
                <Button
                  type="submit"
                  form="ask-form"
                  variant="primary"
                  fit
                  disabled={!title.trim() || !date || badLink}
                >
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
      </div>
    </>
  );
}
