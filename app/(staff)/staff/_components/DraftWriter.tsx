"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { MAX_ATTACHMENT_BYTES } from "@/lib/mailing-attachments";
import { earliestHour } from "@/lib/staff-time";
import type { MailingAttachmentSummary, SaveResult } from "@/lib/server/mailing-drafts";
import { CHECK_EVERY } from "./DueTime";
import styles from "./MailingWriter.module.css";

// What a draft mailing's page and a draft message's page share: saving as
// you type, its files, and its title with whether it's saved.

const copy = staffCopy.mailingPages;

/** How long after the last change a draft saves itself. */
const SAVE_DELAY = 800;

export type SaveState = "saving" | "saved" | "conflict" | "failed";

export type AttachResult = (SaveResult | { saved: false; reason: "too-big" }) & {
  attachments: MailingAttachmentSummary[];
};

/** The Server Actions saving a draft takes, which the page hands in. */
export type DraftActions = {
  save: (id: number, version: number, changes: unknown) => Promise<SaveResult | undefined>;
  attach: (form: FormData) => Promise<AttachResult | undefined>;
  detach: (id: number, version: number, attachmentId: number) => Promise<AttachResult>;
};

/** A section's title: its number, then its name. */
export function Numbered({ n, children }: { n: number; children: ReactNode }) {
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
function SaveStatePill({ state }: { state: SaveState }) {
  return (
    <span className={styles.saveState} data-state={state}>
      <span className={styles.saveDot} aria-hidden="true" />
      {copy.savePill[state]}
    </span>
  );
}

/**
 * A draft's title, with whether it's saved at the top right, scrolling away
 * with the title; once the title has scrolled off, in a bar at the top of
 * the window with the title, in the same place.
 */
export function DraftTitle({ title, saveState }: { title: string; saveState: SaveState }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [titleGone, setTitleGone] = useState(false);
  useEffect(() => {
    // Gone once half of it has scrolled off.
    const watch = new IntersectionObserver(([entry]) => setTitleGone(entry.intersectionRatio < 0.5), {
      threshold: [0, 0.5, 1],
    });
    watch.observe(heading.current!);
    return () => watch.disconnect();
  }, []);
  return (
    <>
      <div className={styles.barFrame} data-shown={titleGone || undefined}>
        <div className={styles.bar}>
          <strong aria-hidden="true">{title}</strong>
          <span role="status">
            <SaveStatePill state={saveState} />
          </span>
        </div>
      </div>
      <h1 ref={heading} className={styles.title}>
        {title}
      </h1>
    </>
  );
}

/**
 * A draft's values and saving them: each change a moment after it's made,
 * or at once with saveNow, before leaving the page, scheduling or sending a
 * test. `fresh`, what a draft with nothing written yet starts with, is
 * saved with its first change. Someone else saving meanwhile stops the
 * saving and says so. A time too soon, or gone, when the draft is opened, or
 * that becomes so while it's open, moves on to the first hour it can go at,
 * and that's saved.
 */
export function useDraftWriter<Changes extends { dueAt: string | null }>({
  id,
  version: firstVersion,
  initial,
  fresh,
  attachments: firstAttachments,
  actions,
}: {
  id: number;
  version: number;
  initial: Changes;
  fresh: Partial<Changes>;
  attachments: MailingAttachmentSummary[];
  actions: DraftActions;
}) {
  const version = useRef(firstVersion);
  const [values, setValues] = useState<Changes>(() => ({ ...initial, ...fresh }));
  const latest = useRef(values);
  const [attachments, setAttachments] = useState(firstAttachments);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [fileProblem, setFileProblem] = useState("");
  const pending = useRef<Partial<Changes>>(fresh);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function flush(): Promise<void> {
    if (saving.current) return later();
    const changes = pending.current;
    pending.current = {};
    saving.current = true;
    setSaveState("saving");
    try {
      const result = (await actions.save(id, version.current, changes))!;
      if (result.saved) {
        version.current = result.version;
        setSaveState("saved");
      } else {
        setSaveState("conflict");
      }
    } catch {
      pending.current = { ...changes, ...pending.current };
      setSaveState("failed");
    } finally {
      saving.current = false;
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

  async function saveNow(): Promise<void> {
    clearTimeout(timer.current);
    if (Object.keys(pending.current).length) await flush();
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

  const detach = async (file: number) => void attached(await actions.detach(id, version.current, file));

  useEffect(() => {
    const check = () => {
      const due = latest.current.dueAt;
      if (due && Date.parse(due) < Date.parse(earliestHour())) change({ dueAt: earliestHour() } as Partial<Changes>);
    };
    check();
    const timer = setInterval(check, CHECK_EVERY);
    return () => clearInterval(timer);
    // The checks read what's latest, so they're set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { values, change, saveNow, saveState, version, attachments, attach, detach, fileProblem };
}
