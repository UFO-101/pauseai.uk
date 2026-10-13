"use client";

import { useEffect } from "react";

// Filled in on the client so a statically rendered page doesn't keep the
// year it was built in.
//
// This used to be ScrollInit, which also re-scrolled to the URL's fragment
// after load to correct for late layout shift. The homepage no longer shifts
// after load (the local groups map and the people carousel now reserve their
// final size in the server render), and route changes jump rather than
// animate, so the browser's own fragment scroll lands and stays put.
export default function FooterYear() {
  useEffect(() => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear().toString();
  }, []);

  return null;
}
