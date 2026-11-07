"use client";

import type { JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, ButtonAnchor } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field, Hint, Label } from "@/components/ui/Field";
import { Muted } from "@/components/ui/Text";
import { useLeaving } from "@/components/ui/useLeaving";
import { staffCopy } from "@/lib/content/staff-interface";
import {
  checkMailingDoc,
  conditionsIn,
  EMPTY_MAILING_DOC,
  greetingLetter,
  isBlankMailing,
  letterFor,
  NOT_CONDITION,
  type MailingDoc,
} from "@/lib/mailing-doc";
import { MAX_ATTACHMENT_BYTES } from "@/lib/mailing-attachments";
import { answerLabels } from "@/lib/mailing-fields";
import StaffLink from "./ui/StaffLink";
import { DEFAULT_SENDER } from "@/lib/gmail-connect";
import { looksLikeEmail } from "@/lib/email-your-mp";
import { named } from "@/lib/email-parsing/addresses";
import { leavePage } from "@/lib/leave-page";
import { scheduleProblems } from "@/lib/mailing-schedule";
import { filtersPath } from "@/lib/staff-search";
import { earliestHour, fromLondon, londonDayHour, londonWhen } from "@/lib/staff-time";
import type { ChannelResult } from "@/lib/server/mailing-channels";
import type { MailingAttachmentSummary, SaveResult, ScheduleResult, WrittenMailing } from "@/lib/server/mailing-drafts";
import type { PreviewRecipient, WriterData } from "@/lib/server/mailing-pages";
import { CHECK_EVERY, DueTimeFields } from "./DueTime";
import { SentToday } from "./GmailConnect";
import { DeleteDraft } from "./MailingButtons";
import MailingEditor from "./MailingEditor";
import MailingFiles from "./MailingFiles";
import { MailingLetter } from "./MailingLetter";
import Grid, { Card } from "./ui/Grid";
import Bubble from "./ui/Bubble";
import NotIcon from "./ui/NotIcon";
import Strip from "./ui/Strip";
import styles from "./MailingWriter.module.css";

const copy = staffCopy.mailingPages;

/** How long after the last change a draft saves itself. */
const SAVE_DELAY = 800;

/** The fields a new letter's greeting can use, the first every recipient has. */
const GREETING_FIELDS = ["salutation", "name"];

/** What a mailing's page can change. */
type Changes = {
  subject: string;
  body: MailingDoc;
  ask: string | null;
  sentFrom: string | null;
  /** The name it's from; empty or null, the Gmail's own. */
  fromName: string | null;
  dueAt: string | null;
};

type AttachResult = (SaveResult | { saved: false; reason: "too-big" }) & { attachments: MailingAttachmentSummary[] };

/** The mailing pages' Server Actions (app/(staff)/staff/mailing-actions.ts), which the page hands in. */
export type MailingWriterActions = {
  save: (id: number, version: number, changes: unknown) => Promise<SaveResult | undefined>;
  attach: (form: FormData) => Promise<AttachResult | undefined>;
  detach: (id: number, version: number, attachmentId: number) => Promise<AttachResult>;
  sendTest: (id: number, politicianId: number, to: string) => Promise<(ChannelResult & { to: string }) | undefined>;
  schedule: (id: number, version: number) => Promise<ScheduleResult>;
  deleteDraft: (form: FormData) => void | Promise<void>;
};

type SaveState = "saving" | "saved" | "conflict" | "failed";

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

/** Whether the draft is saved: saving, grey; saved, green; not saved, red. */
function SaveState({ state }: { state: SaveState }) {
  return (
    <span className={styles.saveState} data-state={state}>
      <span className={styles.saveDot} aria-hidden="true" />
      {copy.savePill[state]}
    </span>
  );
}

/** A "?" that opens a few words on what the thing beside it is for. */
function Help({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <Bubble id={id} label="?" trigger={styles.help} name={label}>
      {children}
    </Bubble>
  );
}

/**
 * A draft mailing, on one page, in six numbered sections: who it's to, as
 * pills, with Change who, and who's left out; writing it, its subject, ask,
 * letter and files; a preview of each recipient's email, a case at a time;
 * whose Gmail it's from; when it goes, never in the past; and what will go,
 * with the button to schedule it, greyed with the reasons while anything
 * stops it. A draft with nothing written yet starts with a greeting, from
 * the policy team's Gmail, both saved with its first change. A draft saves
 * itself a moment after each change. Someone else saving it meanwhile stops
 * the saving and says so.
 */
export default function MailingWriter({
  data,
  draft,
  who,
  actions,
}: {
  data: WriterData;
  draft: WrittenMailing;
  /** Who it's to, as pills (FilterPills). */
  who: ReactNode;
  actions: MailingWriterActions;
}) {
  const router = useRouter();
  const letterLabel = useId();
  const askHelp = `ask-help-${useId().replace(/\W/g, "")}`;
  const askId = useId();
  const { id } = draft;
  const version = useRef(draft.version);
  const [start] = useState(() =>
    greetingLetter(
      copy.greeting,
      GREETING_FIELDS.find((field) => data.fields.some((f) => f.id === field && !f.lacking)),
    ),
  );
  // A draft with nothing written yet, as one is when it's made: its greeting and its Gmail are to be saved.
  const [fresh] = useState<Partial<Changes>>(() =>
    !draft.subject && isBlankMailing(draft.body)
      ? {
          body: start,
          // The policy team's Gmail, if it's connected, or else the first that is.
          sentFrom:
            draft.sentFrom ??
            (data.senders.find((one) => one.email === DEFAULT_SENDER) ?? data.senders[0])?.email ??
            null,
        }
      : {},
  );
  const [values, setValues] = useState<Changes>(() => ({
    subject: draft.subject,
    body: draft.body,
    ask: draft.ask,
    sentFrom: draft.sentFrom,
    fromName: draft.fromName || null,
    dueAt: draft.dueAt,
    ...fresh,
  }));
  const latest = useRef(values);
  const [attachments, setAttachments] = useState(draft.attachments);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [fileProblem, setFileProblem] = useState("");
  const [dayPicked, setDayPicked] = useState("");
  const pending = useRef<Partial<Changes>>(fresh);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  const [titleGone, setTitleGone] = useState(false);
  // Change who, from its click while the draft's saved until the list comes.
  const [choosing, choose] = useLeaving();
  // The link to add an ask, likewise, until the ask's page comes.
  const [asking, goToAsk] = useLeaving();
  const [scheduling, setScheduling] = useState(false);
  useEffect(() => {
    // Gone once half of it has scrolled off.
    const watch = new IntersectionObserver(([entry]) => setTitleGone(entry.intersectionRatio < 0.5), {
      threshold: [0, 0.5, 1],
    });
    watch.observe(heading.current!);
    return () => watch.disconnect();
  }, []);

  /** Whether a letter has nothing written in it yet: blank, or only the greeting it started with. */
  const unwritten = (letter: MailingDoc) => isBlankMailing(letter) || JSON.stringify(letter) === JSON.stringify(start);

  /** Saves what's changed. */
  async function flush(): Promise<void> {
    if (saving.current) return later();
    const changes = pending.current;
    pending.current = {};
    saving.current = true;
    setSaveState("saving");
    try {
      await save(changes);
    } catch {
      pending.current = { ...changes, ...pending.current };
      setSaveState("failed");
    } finally {
      saving.current = false;
    }
  }

  async function save(changes: Partial<Changes>): Promise<void> {
    const result = (await actions.save(id, version.current, changes))!;
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

  // The draft's own page, which Connect Gmail and the Asks page come back to.
  const writerPath = `/staff/mailings/${id}`;

  /** Saves now what's waiting to be saved, before leaving the page, scheduling or sending a test. */
  async function saveNow(): Promise<void> {
    clearTimeout(timer.current);
    if (Object.keys(pending.current).length) await flush();
  }

  // The politicians list, choosing who it goes to: those ticked, or, for a draft from before ticks, its filter.
  const whoPath = data.filter.picked
    ? filtersPath("/staff/politicians", { mailing: String(id), tab: "ticked" })
    : filtersPath("/staff/politicians", { ...data.filter.params, mailing: String(id) });

  /**
   * Attaches each file in turn, stopping at the first that isn't. One too
   * big isn't sent, as Next.js would refuse the request before the server
   * could say why.
   */
  async function attach(files: File[]) {
    setFileProblem("");
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) return setFileProblem(copy.tooBig);
      const form = new FormData();
      clearTimeout(timer.current);
      form.set("id", String(id));
      form.set("version", String(version.current));
      form.set("file", file);
      const result = await actions.attach(form).catch(() => null);
      if (result === null) return setFileProblem(copy.attachFailed);
      if (!attached(result)) return;
    }
  }

  /** Shows what's attached after an attach or a detach; whether it was done. */
  function attached(result: AttachResult | undefined): boolean {
    if (!result) return false;
    setAttachments(result.attachments);
    if (result.saved) version.current = result.version;
    else if (result.reason === "too-big") setFileProblem(copy.tooBig);
    else setSaveState("conflict");
    return result.saved;
  }

  // A time too soon, or gone, when the draft is opened, or that becomes so
  // while it's open, moves on to the first hour it can go at, and that's saved.
  useEffect(() => {
    const check = () => {
      const due = latest.current.dueAt;
      if (due && Date.parse(due) < Date.parse(earliestHour())) change({ dueAt: earliestHour() });
    };
    check();
    const timer = setInterval(check, CHECK_EVERY);
    return () => clearInterval(timer);
    // The checks read what's latest, so they're set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body = useMemo(() => checkMailingDoc(values.body) ?? EMPTY_MAILING_DOC, [values.body]);
  const earliest = londonDayHour(earliestHour());
  // Before an hour's chosen, the day picked, or the first it can go, and no hour.
  const when: { day: string; hour: number | null } = values.dueAt
    ? londonDayHour(values.dueAt)
    : { day: dayPicked || earliest.day, hour: null };
  const sender = data.senders.find((one) => one.email === values.sentFrom);
  const lacking = data.fields.filter((field) => field.lacking).map((field) => field.id);
  const written = !unwritten(body);
  const problems = scheduleProblems({
    ...values,
    // A letter of only its greeting is no letter.
    body: written ? body : EMPTY_MAILING_DOC,
    recipients: data.recipients.length,
    lacking,
    unknown: data.unknown,
    sends: data.sends,
    connected: Boolean(sender),
  }).filter((problem) => problem !== "cannot-send");
  const title = values.subject.trim() || copy.newTitle;
  // The connected accounts, the policy team's first, and the one chosen if it isn't one any more.
  const senderChoices = [
    ...data.senders
      .toSorted((a, b) => Number(b.email === DEFAULT_SENDER) - Number(a.email === DEFAULT_SENDER))
      .map((one) => ({ ...one, connected: true })),
    ...(values.sentFrom && !sender ? [{ email: values.sentFrom, name: "", remaining: 0, connected: false }] : []),
  ];
  const noAddress = data.leftOut.filter((one) => one.reason === "no-address").length;

  return (
    <>
      {/* Whether it's saved, at the top right, scrolling away with the title; once the title has
          scrolled off, in a bar at the top of the window with the title, in the same place. */}
      <div className={styles.barFrame} data-shown={titleGone || undefined}>
        <div className={styles.bar}>
          <strong aria-hidden="true">{title}</strong>
          <span role="status">
            <SaveState state={saveState} />
          </span>
        </div>
      </div>
      <h1 ref={heading} className={styles.title}>
        {title}
      </h1>
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
            <ButtonAnchor
              variant="primary"
              size="small"
              fit
              href={whoPath}
              pending={choosing}
              onClick={async (event) => {
                // What's typed is saved first, so going to the list loses none of it.
                event.preventDefault();
                choose();
                await saveNow();
                leavePage(whoPath);
              }}
            >
              {data.filter.picked?.ids.length === 0 ? copy.chooseWho : copy.changeWho}
            </ButtonAnchor>
          </div>
          {data.unknown.length > 0 && <Strip tone="amber">{copy.unknownFilter(data.unknown.join(", "))}</Strip>}
          <p className={styles.count}>{copy.willGet(data.recipients.length)}</p>
          {data.leftOut.length > 0 && (
            <details className={styles.leftOut}>
              <summary>
                {copy.leftOut(
                  data.recipients.length + data.leftOut.length,
                  noAddress,
                  data.leftOut.length - noAddress,
                  Boolean(data.filter.picked),
                )}
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
          <Field label={copy.subject}>
            <TextInput value={values.subject} onChange={(event) => change({ subject: event.target.value })} />
          </Field>
          <div className={styles.ask}>
            {/* The ? beside the word, outside the label, as a label holds only its own control. */}
            <div className={styles.withHelp}>
              <Label htmlFor={askId}>{copy.ask}</Label>
              <Help id={askHelp} label={copy.askHelpLabel}>
                {copy.askHelp}
              </Help>
            </div>
            <Select
              id={askId}
              value={values.ask ?? ""}
              onChange={(event) => change({ ask: event.target.value || null })}
            >
              <option value="">{copy.noAsk}</option>
              {data.asks.map((ask) => (
                <option key={ask.slug} value={ask.slug}>
                  {ask.title}
                </option>
              ))}
            </Select>
            <Hint>
              <a
                href={`/staff/asks/new?${new URLSearchParams({ back: writerPath })}`}
                data-pending={asking || undefined}
                onClick={async (event) => {
                  event.preventDefault();
                  goToAsk();
                  await saveNow();
                  leavePage(`/staff/asks/new?${new URLSearchParams({ back: writerPath })}`);
                }}
              >
                {copy.newAsk}
              </a>
            </Hint>
          </div>
          <div className={styles.letter}>
            <p id={letterLabel} className={styles.label}>
              {copy.letter}
            </p>
            <MailingEditor
              initial={values.body as JSONContent}
              onChange={(doc) => change({ body: doc as MailingDoc })}
              fields={data.fields}
              conditions={data.conditions}
              recipients={data.recipients.length}
              labelledBy={letterLabel}
            />
          </div>
          <div>
            <p className={styles.label}>{copy.attachments}</p>
            <MailingFiles
              files={attachments}
              base={`/staff/mailings/${id}/files`}
              onAdd={attach}
              onRemove={async (file) => void attached(await actions.detach(id, version.current, file))}
              problem={fileProblem}
            />
          </div>
        </Card>

        <Card span={6} title={<Numbered n={3}>{copy.sections.preview}</Numbered>} id="preview-title">
          <Preview
            data={data}
            body={body}
            subject={values.subject}
            sentFrom={values.sentFrom}
            fromName={values.fromName}
            written={written}
            sendTest={async (recipient, to) => {
              // The test is of the draft as saved, so what's typed goes first.
              await saveNow();
              return actions.sendTest(id, recipient, to);
            }}
          />
        </Card>

        <Card span={6} title={<Numbered n={4}>{copy.sections.from}</Numbered>} id="from-title">
          {/* The choice of connected Gmails, beside the name the mailing goes in, then what the chosen one has
              sent today, or that there's none; then, while yours isn't connected, where to connect it. */}
          <div className={styles.from}>
            {senderChoices.length > 0 ? (
              <>
                <div className={styles.fromFields}>
                  <Field label={copy.fromLegend} className={styles.sender}>
                    <Select
                      value={values.sentFrom ?? ""}
                      onChange={(event) => change({ sentFrom: event.target.value })}
                    >
                      {!values.sentFrom && (
                        <option value="" disabled>
                          {copy.choose}
                        </option>
                      )}
                      {senderChoices.map((sender) => (
                        <option key={sender.email} value={sender.email}>
                          {sender.connected ? sender.email : copy.senderNotConnected(sender.email)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {/* Until it's edited, the Gmail's own name, following the account chosen. Left empty, it's that name too. */}
                  <Field label={copy.fromNameLabel} className={styles.sender}>
                    <TextInput
                      value={values.fromName ?? sender?.name ?? ""}
                      onChange={(event) => change({ fromName: event.target.value })}
                      onBlur={() => values.fromName === "" && change({ fromName: null })}
                    />
                  </Field>
                </div>
                {sender && <SentToday sent={sender.sentToday} />}
              </>
            ) : (
              <p>{copy.noSenders}</p>
            )}
            {values.sentFrom && !sender && <Hint>{copy.notConnected}</Hint>}
            {/* Connecting is done on the account's own page, logged in as it. */}
            {!data.senders.some((one) => one.email === data.me) && (
              <p>
                <StaffLink href="/staff/me#gmail">{copy.connectOne}</StaffLink>
              </p>
            )}
          </div>
        </Card>

        <Card span={6} title={<Numbered n={5}>{copy.sections.when}</Numbered>} id="when-title">
          <div className={styles.when}>
            <DueTimeFields
              day={when.day}
              hour={when.hour}
              dayClass={styles.day}
              hourClass={styles.hour}
              onChange={(day, hour) => {
                setDayPicked(day);
                if (hour !== null) change({ dueAt: fromLondon(day, hour) });
              }}
            />
          </div>
        </Card>

        <Card span={6} title={<Numbered n={6}>{copy.sections.send}</Numbered>} id="send-title">
          <p className={styles.count}>
            {copy.summary(data.recipients.length, values.sentFrom, values.dueAt ? londonWhen(values.dueAt) : null)}
          </p>
          <div className={styles.send}>
            <Button
              variant="primary"
              fit
              disabled={problems.length > 0 || !data.sends}
              pending={scheduling}
              onClick={async () => {
                setScheduling(true);
                // What's still to be saved, such as a time just chosen, goes first, or it's scheduled without it.
                await saveNow();
                const result = await actions.schedule(id, version.current);
                // The page becomes the scheduled mailing's, which starts at its top, at once, as a new page would;
                // till then the button stays pending.
                if (result.scheduled) {
                  window.scrollTo({ top: 0, behavior: "instant" });
                  router.refresh();
                } else {
                  setScheduling(false);
                }
              }}
            >
              {copy.schedule(data.recipients.length)}
            </Button>
            <DeleteDraft id={id} action={actions.deleteDraft} />
          </div>
          {problems.length > 0 && (
            <ul className={styles.problems}>
              {problems.map((problem) => (
                <li key={problem}>{copy.problems[problem]}</li>
              ))}
            </ul>
          )}
          {!data.sends && <Strip tone="amber">{copy.cantSend}</Strip>}
        </Card>
      </Grid>
    </>
  );
}

/**
 * Each recipient's email, as they'll get it. Over it, a button for each
 * condition the letter's parts use, pressed for those who meet it, unpressed
 * for those who don't, each press choosing the first recipient with the
 * answers pressed; then the choice of every recipient, which sets the
 * buttons to theirs. With no one with the answers pressed, no email, as
 * there's no one to fill it in for. Under it, a test copy, sent to
 * yourself, once the letter has something written.
 */
function Preview({
  data,
  body,
  subject,
  sentFrom,
  fromName,
  written,
  sendTest,
}: {
  data: WriterData;
  body: MailingDoc;
  subject: string;
  sentFrom: string | null;
  fromName: string | null;
  /** Whether the letter has anything in it but its greeting, so there's something to test. */
  written: boolean;
  /** Sends the test copy of a recipient's email. */
  sendTest: (recipient: number, to: string) => ReturnType<MailingWriterActions["sendTest"]>;
}) {
  // Where the test copy goes: you, unless you give another address.
  const [testTo, setTestTo] = useState(data.me);
  const testToId = useId();
  // As its From line will show it: in the name chosen, or the Gmail's own, if it has one.
  const fromLine = named(fromName || data.senders.find((sender) => sender.email === sentFrom)?.name, sentFrom!);
  const findLabel = useId();
  const [chosen, setChosen] = useState(data.recipients[0]?.id);
  // The answers pressed, since someone was last chosen; else theirs.
  const [wanted, setWanted] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<{ to?: string } | undefined>();
  const [sending, setSending] = useState(false);
  const first = data.recipients[0];
  if (!first) return <p>{copy.noOne}</p>;
  const shown = data.recipients.find((r) => r.id === chosen) ?? first;
  const used = [
    ...new Set(conditionsIn(body).map((c) => (c.startsWith(NOT_CONDITION) ? c.slice(NOT_CONDITION.length) : c))),
  ];
  const meets = Object.fromEntries(used.map((c) => [c, wanted[c] ?? shown.meets.includes(c)]));
  const fits = (r: PreviewRecipient, answers: Record<string, boolean>) =>
    used.every((c) => r.meets.includes(c) === answers[c]);
  const recipient = fits(shown, meets) ? shown : undefined;
  const labels = answerLabels(data.asks);
  const toggle = (condition: string) => {
    const answers = { ...meets, [condition]: !meets[condition] };
    setWanted(answers);
    const match = data.recipients.find((r) => fits(r, answers));
    if (match) setChosen(match.id);
    setSent(undefined);
  };
  return (
    <>
      {used.length > 0 && (
        <div className={styles.find}>
          <p id={findLabel} className={styles.label}>
            {copy.findRecipient}
          </p>
          <ul className={styles.toggles} aria-labelledby={findLabel}>
            {used.map((condition) => (
              <li key={condition}>
                <button type="button" aria-pressed={meets[condition]} onClick={() => toggle(condition)}>
                  {!meets[condition] && <NotIcon />}
                  {labels[condition] ?? condition}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Field label={copy.chooseRecipient} className={styles.whoShown}>
        <Select
          value={recipient?.id ?? ""}
          onChange={(event) => {
            setChosen(Number(event.target.value));
            setWanted({});
            setSent(undefined);
          }}
        >
          {!recipient && <option value="" disabled />}
          {data.recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.constituency ? `${r.name} · ${r.constituency}` : r.name}
            </option>
          ))}
        </Select>
      </Field>
      {recipient ? (
        <div className={styles.email}>
          <dl className={styles.headers}>
            <dt>{copy.from}</dt>
            <dd>{sentFrom ? fromLine : <Muted>{copy.noSender}</Muted>}</dd>
            <dt>{copy.to}</dt>
            <dd>{`${recipient.name} <${recipient.email}>`}</dd>
            <dt>{copy.subject}</dt>
            <dd>
              <strong>{subject}</strong>
            </dd>
          </dl>
          <MailingLetter doc={letterFor(body, recipient)} />
        </div>
      ) : (
        // No one to fill it in for: no email, rather than one made up.
        <p className={styles.noEmail}>{copy.noOneMix}</p>
      )}
      <div className={styles.test}>
        <div className={styles.testRow}>
          <label htmlFor={testToId} className={styles.testLabel}>
            {copy.sendTestTo}
          </label>
          <span className={styles.testTo}>
            <TextInput id={testToId} type="email" value={testTo} onChange={(event) => setTestTo(event.target.value)} />
          </span>
          <Button
            variant="primary"
            fit
            disabled={!written || !recipient || !looksLikeEmail(testTo.trim())}
            pending={sending}
            onClick={async () => {
              setSending(true);
              const result = await sendTest(recipient!.id, testTo.trim());
              setSending(false);
              setSent({ to: result?.sent ? result.to : undefined });
            }}
          >
            {copy.sendTest}
          </Button>
        </div>
        <Muted>{copy.testVia(data.senders.some((sender) => sender.email === sentFrom) ? sentFrom : null)}</Muted>
        <Muted>
          <span role="status">
            {!written ? copy.testNeedsDraft : sent && (sent.to ? copy.testSent(sent.to) : copy.testFailed)}
          </span>
        </Muted>
      </div>
    </>
  );
}
