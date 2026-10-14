"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/content/email-your-mp";
import styles from "./EmailYourMp.module.css";

/**
 * Sends the letter, given the token in the link's #fragment. The fragment
 * never reaches a server log, and the send is a POST from this script, so a
 * link scanner that only fetches the page sends nothing.
 */
export default function ConfirmLetter() {
  const [message, setMessage] = useState(copy.confirm.sending);
  const [state, setState] = useState<"sending" | "sent" | "failed">("sending");
  // React runs effects twice in development; a token works once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = location.hash.slice(1);
    // Without a token there's nothing to ask the server.
    const sending = token
      ? fetch("/api/email-your-mp/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }).then((res) => res.json())
      : Promise.resolve({ ok: false, message: copy.confirm.invalid });
    sending
      .then((result) => {
        setMessage(result.message);
        setState(result.ok ? "sent" : "failed");
      })
      .catch(() => {
        setMessage(copy.confirm.failed);
        setState("failed");
      });
  }, []);

  return (
    <p className={state === "sent" ? styles.success : state === "failed" ? styles.error : undefined} role="status">
      {message}
    </p>
  );
}
