"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * For a button that leaves the page, whose next page can take a while:
 * whether it's on its way, from `leave()` until this page shows again, as
 * when the browser's Back brings it back from the next. For its `pending`.
 */
export function useLeaving(): [leaving: boolean, leave: () => void] {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const shown = () => setLeaving(false);
    window.addEventListener("pageshow", shown);
    return () => window.removeEventListener("pageshow", shown);
  }, []);
  return [leaving, useCallback(() => setLeaving(true), [])];
}

/**
 * Whether the form of the submit button `button` has been sent to a URL,
 * leaving the page, as useLeaving says. Heard on the window, after
 * everything else has heard it, so a form whose sending was stopped (a
 * Server Action's, which React runs in the page, or one refused by a
 * check) isn't leaving.
 */
export function useFormLeaving(button: RefObject<HTMLButtonElement | null>): boolean {
  const [leaving, leave] = useLeaving();
  useEffect(() => {
    const sent = (event: SubmitEvent) => {
      if (event.target === button.current!.form && !event.defaultPrevented) leave();
    };
    window.addEventListener("submit", sent);
    return () => window.removeEventListener("submit", sent);
  }, [button, leave]);
  return leaving;
}
