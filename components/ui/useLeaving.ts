"use client";

import { useEffect, useState } from "react";

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
  return [leaving, () => setLeaving(true)];
}
