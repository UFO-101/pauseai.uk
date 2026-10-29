"use client";

import { useSearchParams } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { connectPath, GMAIL_DAILY_LIMIT } from "@/lib/gmail-connect";
import Strip from "./ui/Strip";
import styles from "./GmailConnect.module.css";

const copy = staffCopy.gmail;
const LIMIT = GMAIL_DAILY_LIMIT.toLocaleString("en-GB");

/**
 * What connecting your Gmail means, said before it goes to Google: what
 * it's for, that any staff member can then send from it, what the site
 * reads, and the daily limit; then the button, which goes to Google and
 * comes back to `back`.
 */
export function GmailConnect({ back, onConnect }: { back: string; onConnect?: () => Promise<void> }) {
  const href = connectPath(back);
  return (
    <div className={styles.connect}>
      {copy.explain.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p>{copy.limit(LIMIT)}</p>
      <a
        className={buttonClass({ variant: "primary", fit: true })}
        href={href}
        // Saves what's waiting to be saved before leaving the page.
        onClick={
          onConnect &&
          (async (event) => {
            event.preventDefault();
            await onConnect();
            window.location.assign(href);
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
export function GmailOutcome() {
  const outcome = useSearchParams().get("gmail");
  const words = outcome ? copy.outcomes[outcome] : undefined;
  if (!words) return null;
  return (
    <Strip tone={outcome === "connected" ? "green" : "amber"} announce>
      {words}
    </Strip>
  );
}
