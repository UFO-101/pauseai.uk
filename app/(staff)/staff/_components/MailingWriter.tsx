"use client";

import type { JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FileInput, Select, TextInput } from "@/components/ui/Controls";
import { Field, Hint } from "@/components/ui/Field";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { checkMailingDoc, EMPTY_MAILING_DOC, isBlankMailing, letterFor, type MailingDoc } from "@/lib/mailing-doc";
import { scheduleProblems } from "@/lib/mailing-schedule";
import { filtersPath } from "@/lib/staff-search";
import { fromLondon, londonDayHour, londonWhen } from "@/lib/staff-time";
import type { ChannelResult } from "@/lib/server/mailing-channels";
import type { MailingAttachmentSummary, SaveResult, ScheduleResult, WrittenMailing } from "@/lib/server/mailing-drafts";
import type { PreviewRecipient, WriterData } from "@/lib/server/mailing-pages";
import { DeleteDraft } from "./MailingButtons";
import MailingEditor from "./MailingEditor";
import { MailingLetter } from "./MailingLetter";
import Grid, { Card } from "./ui/Grid";
import Strip from "./ui/Strip";
import styles from "./MailingWriter.module.css";

const copy = staffCopy.mailingPages;

/** How long after the last change a draft saves itself. */
const SAVE_DELAY = 800;

/** How many recipients the preview's search offers at once. */
const MATCHES = 6;

/** What a new mailing's letter can say, before and after it's saved. */
type Changes = {
  subject: string;
  body: MailingDoc;
  ask: string | null;
  sentFrom: string | null;
  fromName: string | null;
  dueAt: string | null;
};

type AttachResult = (SaveResult | { saved: false; reason: "too-big" }) & { attachments: MailingAttachmentSummary[] };

/** The mailing pages' Server Actions (app/(staff)/staff/mailing-actions.ts), which the page hands in. */
export type MailingWriterActions = {
  start: (
    params: WriterData["filter"]["params"],
    changes: unknown,
  ) => Promise<{ id: number; version: number } | undefined>;
  save: (id: number, version: number, changes: unknown) => Promise<SaveResult | undefined>;
  attach: (form: FormData) => Promise<AttachResult | undefined>;
  detach: (id: number, version: number, attachmentId: number) => Promise<AttachResult>;
  sendTest: (id: number, politicianId: number) => Promise<ChannelResult | undefined>;
  schedule: (id: number, version: number) => Promise<ScheduleResult>;
  deleteDraft: (form: FormData) => void | Promise<void>;
};

type SaveState = "new" | "saving" | "saved" | "conflict" | "failed";

/** A section's title: its number, then its name. */
function Numbered({ n, children }: { n: number; children: ReactNode }) {
  return (
    <>
      <span className={styles.number} aria-hidden="true">
        {n}
      </span>
      {children}
    </>
  );
}

/** The recipients whose name or constituency has every word typed, the first few. */
function matching(recipients: PreviewRecipient[], typed: string): PreviewRecipient[] {
  const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
  return recipients
    .filter((r) => words.every((word) => `${r.name} ${r.constituency ?? ""}`.toLowerCase().includes(word)))
    .slice(0, MATCHES);
}

/**
 * A new mailing, or a draft, on one page, in six numbered sections: who
 * it's to, the filter's pills with Change who, and who's left out; writing
 * it, its subject, ask, letter and files; a preview of one recipient's
 * email, with a test copy to yourself; whose Gmail it's from and the name;
 * when it goes; and what will go, with the button to schedule it, greyed
 * with the reasons while anything stops it. A new mailing is saved as a
 * draft at its first change worth keeping (a subject, a letter or a file),
 * and the address bar then names it; a draft saves itself a moment after
 * each change. Someone else saving it meanwhile stops the saving and says so.
 */
export default function MailingWriter({
  data,
  draft,
  who,
  actions,
}: {
  data: WriterData;
  draft: WrittenMailing | null;
  /** Who it's to, as pills (FilterPills). */
  who: ReactNode;
  actions: MailingWriterActions;
}) {
  const router = useRouter();
  const letterLabel = useId();
  const id = useRef(draft?.id ?? null);
  const version = useRef(draft?.version ?? 0);
  const [savedId, setSavedId] = useState(draft?.id ?? null);
  const [values, setValues] = useState<Changes>({
    subject: draft?.subject ?? "",
    body: draft?.body ?? EMPTY_MAILING_DOC,
    ask: draft?.ask ?? null,
    sentFrom: draft?.sentFrom ?? null,
    fromName: draft?.fromName ?? null,
    dueAt: draft?.dueAt ?? null,
  });
  const latest = useRef(values);
  const [attachments, setAttachments] = useState(draft?.attachments ?? []);
  const [saveState, setSaveState] = useState<SaveState>(draft ? "saved" : "new");
  const [fileProblem, setFileProblem] = useState("");
  const pending = useRef<Partial<Changes>>({});
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const worthKeeping = (v: Changes) => Boolean(v.subject.trim()) || !isBlankMailing(v.body);

  /** Saves what's changed: makes the draft at the first change worth keeping, then saves to it. */
  async function flush(): Promise<void> {
    if (saving.current) return later();
    const changes = pending.current;
    if (id.current === null && !worthKeeping(latest.current)) return;
    pending.current = {};
    saving.current = true;
    setSaveState("saving");
    try {
      await (id.current === null ? create(latest.current) : save(changes));
    } catch {
      pending.current = { ...changes, ...pending.current };
      setSaveState("failed");
    } finally {
      saving.current = false;
    }
  }

  async function create(changes: Changes): Promise<void> {
    const made = (await actions.start(data.filter.params, changes))!;
    id.current = made.id;
    version.current = made.version;
    setSavedId(made.id);
    window.history.replaceState(null, "", `/staff/mailings/${made.id}`);
    setSaveState("saved");
  }

  async function save(changes: Partial<Changes>): Promise<void> {
    const result = (await actions.save(id.current!, version.current, changes))!;
    if (result.saved) {
      version.current = result.version;
      setSaveState("saved");
    } else {
      setSaveState("conflict");
    }
  }

  function later() {
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  }

  function change(changes: Partial<Changes>) {
    if (saveState === "conflict") return;
    latest.current = { ...latest.current, ...changes };
    setValues(latest.current);
    pending.current = { ...pending.current, ...changes };
    later();
  }

  /** The draft's ID, making it now if it isn't saved yet, as attaching a file is worth keeping. */
  async function draftId(): Promise<number> {
    clearTimeout(timer.current);
    if (id.current === null) {
      pending.current = {};
      await create(latest.current);
    }
    return id.current!;
  }

  async function attach(file: File) {
    setFileProblem("");
    const form = new FormData();
    form.set("id", String(await draftId()));
    form.set("version", String(version.current));
    form.set("file", file);
    attached(await actions.attach(form));
  }

  function attached(result: AttachResult | undefined) {
    if (!result) return;
    setAttachments(result.attachments);
    if (result.saved) version.current = result.version;
    else if (result.reason === "too-big") setFileProblem(copy.tooBig);
    else setSaveState("conflict");
  }

  const body = useMemo(() => checkMailingDoc(values.body) ?? EMPTY_MAILING_DOC, [values.body]);
  const when = values.dueAt ? londonDayHour(values.dueAt) : { day: "", hour: 9 };
  const lacking = data.fields.filter((field) => field.lacking).map((field) => field.id);
  const problems = scheduleProblems({
    ...values,
    body,
    recipients: data.recipients.length,
    lacking,
    unknown: data.unknown,
    sends: data.sends,
  });
  const noAddress = data.leftOut.filter((one) => one.reason === "no-address").length;

  return (
    <>
      <div className={styles.heading}>
        <h1>{values.subject.trim() || copy.newTitle}</h1>
        <Muted>
          <span role="status">{copy.saveStates[saveState]}</span>
        </Muted>
      </div>
      {!data.sends && <Strip tone="amber">{copy.cantSend}</Strip>}
      {saveState === "conflict" && (
        <Strip tone="red" announce>
          {copy.saveStates.conflict}
        </Strip>
      )}
      <Grid>
        <Card span={6} title={<Numbered n={1}>{copy.sections.who}</Numbered>} id="who-title">
          <div className={styles.who}>
            {who}
            <a
              href={filtersPath("/staff/politicians", {
                ...data.filter.params,
                mailing: savedId ? String(savedId) : "",
              })}
            >
              {copy.changeWho}
            </a>
          </div>
          {data.unknown.length > 0 && <Strip tone="amber">{copy.unknownFilter(data.unknown.join(", "))}</Strip>}
          <p className={styles.count}>{copy.willGet(data.recipients.length)}</p>
          {data.leftOut.length > 0 && (
            <details className={styles.leftOut}>
              <summary>
                {copy.leftOut(data.recipients.length + data.leftOut.length, noAddress, data.leftOut.length - noAddress)}{" "}
                <span className={styles.seeWho}>{copy.seeWho}</span>
              </summary>
              <ul>
                {data.leftOut.map((one) => (
                  <li key={one.id}>
                    <a href={`/staff/politicians/${one.id}`}>{one.name}</a>{" "}
                    <Muted>{copy.leftOutReasons[one.reason]}</Muted>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        <Card span={6} title={<Numbered n={2}>{copy.sections.write}</Numbered>} id="write-title">
          <div className={styles.fields}>
            <Field label={copy.subject}>
              <TextInput value={values.subject} onChange={(event) => change({ subject: event.target.value })} />
            </Field>
            <Field label={copy.ask}>
              <Select value={values.ask ?? ""} onChange={(event) => change({ ask: event.target.value || null })}>
                <option value="">{copy.noAsk}</option>
                {data.asks.map((ask) => (
                  <option key={ask.slug} value={ask.slug}>
                    {ask.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p id={letterLabel} className={styles.label}>
            {copy.letter}
          </p>
          <MailingEditor
            initial={values.body as JSONContent}
            onChange={(doc) => change({ body: doc as MailingDoc })}
            fields={data.fields}
            conditions={data.conditions}
            labelledBy={letterLabel}
          />
          <div>
            <p className={styles.label}>{copy.attachments}</p>
            <ul className={styles.files}>
              {attachments.map((file) => (
                <li key={file.id}>
                  {file.filename}
                  <Button
                    variant="ghost"
                    size="small"
                    fit
                    aria-label={copy.removeFile(file.filename)}
                    onClick={async () => attached(await actions.detach(id.current!, version.current, file.id))}
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
            <Field label={copy.addFile}>
              <FileInput
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void attach(file);
                }}
              />
            </Field>
            {fileProblem && <Hint>{fileProblem}</Hint>}
          </div>
        </Card>

        <Card span={6} title={<Numbered n={3}>{copy.sections.preview}</Numbered>} id="preview-title">
          <Preview data={data} body={body} subject={values.subject} draftId={savedId} sendTest={actions.sendTest} />
        </Card>

        <Card span={6} title={<Numbered n={4}>{copy.sections.from}</Numbered>} id="from-title">
          <div className={styles.fields}>
            <Field label={copy.fromLegend}>
              <Select
                value={values.sentFrom ?? ""}
                onChange={(event) => change({ sentFrom: event.target.value || null })}
              >
                <option value="" />
                {data.senders.map((sender) => (
                  <option key={sender} value={sender}>
                    {sender}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={copy.fromName}>
              <TextInput
                value={values.fromName ?? ""}
                onChange={(event) => change({ fromName: event.target.value || null })}
              />
            </Field>
          </div>
          <Hint>{copy.notConnected}</Hint>
        </Card>

        <Card span={6} title={<Numbered n={5}>{copy.sections.when}</Numbered>} id="when-title">
          <div className={styles.fields}>
            <Field label={copy.day}>
              <TextInput
                type="date"
                value={when.day}
                onChange={(event) =>
                  change({ dueAt: event.target.value ? fromLondon(event.target.value, when.hour) : null })
                }
              />
            </Field>
            <Field label={copy.hour}>
              <Select
                value={when.hour}
                disabled={!when.day}
                onChange={(event) => change({ dueAt: fromLondon(when.day, Number(event.target.value)) })}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {`${String(hour).padStart(2, "0")}:00`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Hint>{copy.onTheHour}</Hint>
        </Card>

        <Card span={6} title={<Numbered n={6}>{copy.sections.send}</Numbered>} id="send-title">
          <p className={styles.count}>
            {copy.summary(
              data.recipients.length,
              values.fromName || values.sentFrom,
              values.dueAt ? londonWhen(values.dueAt) : null,
            )}
          </p>
          <div className={styles.send}>
            <Button
              variant="primary"
              fit
              disabled={problems.length > 0}
              onClick={async () => {
                const result = await actions.schedule(savedId!, version.current);
                if (result.scheduled) router.refresh();
              }}
            >
              {copy.schedule(data.recipients.length)}
            </Button>
            {savedId && <DeleteDraft id={savedId} action={actions.deleteDraft} />}
          </div>
          {problems.length > 0 && (
            <ul className={styles.problems}>
              {problems.map((problem) => (
                <li key={problem}>{copy.problems[problem]}</li>
              ))}
            </ul>
          )}
        </Card>
      </Grid>
    </>
  );
}

/**
 * One recipient's email, as they'll get it, picked by a search of names and
 * constituencies, the first to start with; and a test copy of it, sent to
 * yourself, once there's a draft to send it from.
 */
function Preview({
  data,
  body,
  subject,
  draftId,
  sendTest,
}: {
  data: WriterData;
  body: MailingDoc;
  subject: string;
  draftId: number | null;
  sendTest: MailingWriterActions["sendTest"];
}) {
  const [typed, setTyped] = useState("");
  const [chosen, setChosen] = useState(data.recipients[0]?.id);
  const [sent, setSent] = useState<{ ok: boolean } | undefined>();
  const [sending, setSending] = useState(false);
  const recipient = data.recipients.find((r) => r.id === chosen);
  if (!recipient) return <p>{copy.noOne}</p>;
  const matches = typed.trim() ? matching(data.recipients, typed) : [];
  return (
    <>
      <Field label={copy.previewAs}>
        <TextInput
          type="search"
          value={typed}
          placeholder={copy.previewPlaceholder}
          onChange={(event) => setTyped(event.target.value)}
        />
      </Field>
      {typed.trim() && matches.length === 0 && <Hint>{copy.noMatch}</Hint>}
      {matches.length > 0 && (
        <ul className={styles.matches}>
          {matches.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                aria-pressed={r.id === chosen}
                onClick={() => {
                  setChosen(r.id);
                  setTyped("");
                  setSent(undefined);
                }}
              >
                {r.name}
                {r.constituency && <Muted> · {r.constituency}</Muted>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.email}>
        <dl className={styles.headers}>
          <dt>{copy.to}</dt>
          <dd>{`${recipient.name} <${recipient.email}>`}</dd>
          <dt>{copy.subject}</dt>
          <dd>
            <strong>{subject}</strong>
          </dd>
        </dl>
        <MailingLetter doc={letterFor(body, recipient)} />
      </div>
      <div className={styles.send}>
        <Button
          variant="ghost"
          fit
          disabled={!draftId}
          pending={sending}
          onClick={async () => {
            setSending(true);
            const result = await sendTest(draftId!, recipient.id);
            setSending(false);
            setSent({ ok: Boolean(result?.sent) });
          }}
        >
          {copy.sendTest}
        </Button>
        <Muted>
          <span role="status">
            {!draftId ? copy.testNeedsDraft : sent && (sent.ok ? copy.testSent : copy.testFailed)}
          </span>
        </Muted>
      </div>
    </>
  );
}
