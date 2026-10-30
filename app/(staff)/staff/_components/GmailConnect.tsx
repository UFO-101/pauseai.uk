"use client";

import { ButtonAnchor } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { useLeaving } from "@/components/ui/useLeaving";
import { staffCopy } from "@/lib/content/staff-interface";
import { connectPath, GMAIL_DAILY_LIMIT } from "@/lib/gmail-connect";
import Strip from "./ui/Strip";
import styles from "./GmailConnect.module.css";

const copy = staffCopy.gmail;
const LIMIT = GMAIL_DAILY_LIMIT.toLocaleString("en-GB");

/** Each way connecting can end, in its tone: green connected or disconnected, amber when you didn't allow it, red any error. */
const OUTCOME_TONES: Record<string, "green" | "amber"> = {
  connected: "green",
  disconnected: "green",
  refused: "amber",
};

/**
 * What connecting a Gmail means, said before it goes to Google: which
 * account, then in bullets what it's for, what the site reads, and the
 * daily limit; then the button, which goes to Google and comes back to
 * `back`. It's pending from its click until Google's page comes, which can
 * take a moment, and not when the browser's Back shows this page again.
 */
export function GmailConnect({ back }: { back: string }) {
  const [leaving, leave] = useLeaving();
  return (
    <div className={styles.connect}>
      <p>{copy.intro}</p>
      <ul>
        {copy.explain.map((line) => (
          <li key={line}>{line}</li>
        ))}
        <li>{copy.limit(LIMIT)}</li>
      </ul>
      <ButtonAnchor variant="primary" size="small" fit href={connectPath(back)} pending={leaving} onClick={leave}>
        {copy.connect}
      </ButtonAnchor>
    </div>
  );
}

/** How many an account has sent of today's limit. */
export function SentToday({ sent }: { sent: number }) {
  return <Muted>{copy.sentToday(sent, LIMIT)}</Muted>;
}

/**
 * How connecting ended, when Google has sent the staff member `me` back
 * here, in its tone: another account than theirs names theirs.
 */
export function GmailOutcome({ outcome, me }: { outcome: string; me: string }) {
  const words = outcome === "other-account" ? copy.otherAccount(me) : copy.outcomes[outcome];
  if (!words) return null;
  return (
    <Strip tone={OUTCOME_TONES[outcome] ?? "red"} announce>
      {words}
    </Strip>
  );
}
