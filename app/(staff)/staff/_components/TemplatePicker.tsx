"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { MessageTemplate } from "@/lib/server/message-drafts";
import { staffDate } from "@/lib/staff-time";
import { FIELD_WORDS, firstWords } from "@/lib/supporter-messages";
import writer from "./MailingWriter.module.css";
import styles from "./Messages.module.css";

const copy = staffCopy.messagePages;

/** How many templates show until Show all. */
const SHOWN_AT_FIRST = 5;

/** Who made a template, when it was approved and when it was last used, in words. */
export function templateLine(template: MessageTemplate): string {
  return copy.templateBy(
    template.createdBy ?? copy.templateMadeIn,
    staffDate(template.approvedAt!),
    template.lastUsedAt
      ? copy.templateUsed(staffDate(template.lastUsedAt), template.lastUsedTo)
      : copy.templateNeverUsed,
  );
}

/**
 * The WhatsApp approved templates to choose from, none chosen, as radio
 * rows, as they're given, most recently used first: five, with a search and
 * Show all, as there may come to be dozens. The last row opens the editor.
 */
export default function TemplatePicker({
  templates,
  onChoose,
  onNew,
}: {
  templates: MessageTemplate[];
  onChoose: (template: MessageTemplate) => void;
  onNew: () => void;
}) {
  const [search, setSearch] = useState("");
  const [all, setAll] = useState(false);
  const words = search.trim().toLowerCase();
  const found = templates.filter(
    (one) => !words || `${one.name} ${firstWords(one.body, FIELD_WORDS)}`.toLowerCase().includes(words),
  );
  const shown = all || words ? found : found.slice(0, SHOWN_AT_FIRST);
  return (
    <fieldset className={styles.picker}>
      <legend className={writer.label}>{copy.templatesLabel}</legend>
      <Field label={copy.searchTemplates}>
        <TextInput
          value={search}
          placeholder={copy.searchPlaceholder}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Field>
      <div className={styles.templates}>
        {shown.map((one) => (
          <label key={one.id} className={styles.template}>
            <input type="radio" name="template" value={one.id} onChange={() => onChoose(one)} />
            <span className={styles.templateText}>
              <strong>{one.name}</strong>
              <span>{firstWords(one.body, FIELD_WORDS)}</span>
              <Muted>{templateLine(one)}</Muted>
            </span>
          </label>
        ))}
        {found.length === 0 && (
          <p className={styles.templatesNone}>
            <Muted>{copy.noTemplates}</Muted>
          </p>
        )}
        {found.length > shown.length && (
          <div className={styles.templatesFoot}>
            <Button variant="ghost" size="small" fit type="button" onClick={() => setAll(true)}>
              {copy.showAll(found.length)}
            </Button>
          </div>
        )}
        <label className={`${styles.template} ${styles.newTemplate}`}>
          <input type="radio" name="template" value="new" onChange={onNew} />
          <span className={styles.templateText}>
            <strong>{copy.newTemplate}</strong>
            <Muted>{copy.newTemplateHow}</Muted>
          </span>
        </label>
      </div>
    </fieldset>
  );
}
