"use client";

import { buttonClass } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { connectPath, GMAIL_DAILY_LIMIT } from "@/lib/gmail-connect";
import { leavePage } from "@/lib/leave-page";
import Strip from "./ui/Strip";
import styles from "./GmailConnect.module.css";

const copy = staffCopy.gmail;
const LIMIT = GMAIL_DAILY_LIMIT.toLocaleString("en-GB");

/** Each way connecting can end, in its tone: green connected, amber when you didn't allow it, red any error. */
const OUTCOME_TONES: Record<string, "green" | "amber"> = { connected: "green", refused: "amber" };

/**
 * What connecting a Gmail means, said before it goes to Google: which
 * account, then in bullets what it's for, what the site reads, and the
 * daily limit; then the button, which goes to Google and comes back to
 * `back`.
 */
export function GmailConnect({ back, onConnect }: { back: string; onConnect?: () => Promise<string> }) {
  const href = connectPath(back);
  return (
    <div className={styles.connect}>
      <p>{copy.intro}</p>
      <ul>
        {copy.explain.map((line) => (
          <li key={line}>{line}</li>
        ))}
        <li>{copy.limit(LIMIT)}</li>
      </ul>
      <a
        className={buttonClass({ variant: "primary", size: "small", fit: true })}
        href={href}
        // `onConnect` saves what's waiting to be saved before leaving, and says where to come back to.
        onClick={
          onConnect &&
          (async (event) => {
            event.preventDefault();
            leavePage(connectPath(await onConnect()));
          })
        }
      >
        {copy.connect}
      </a>
    </div>
  );
}

/** How many an account has sent of today's limit. */
export function SentToday({ sent }: { sent: number }) {
  return <Muted>{copy.sentToday(sent, LIMIT)}</Muted>;
}

/** How connecting ended, when Google has sent the staff member back here: green if connected, amber if not. */
export function GmailOutcome({ outcome }: { outcome: string }) {
  const words = copy.outcomes[outcome];
  if (!words) return null;
  return (
    <Strip tone={OUTCOME_TONES[outcome] ?? "red"} announce>
      {words}
    </Strip>
  );
}
