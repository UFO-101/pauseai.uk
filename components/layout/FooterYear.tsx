"use client";

import { useEffect } from "react";

// Filled in on the client so a statically rendered page doesn't keep the
// year it was built in.
//
// Nothing re-scrolls to the URL's fragment after load: the homepage doesn't
// shift after load (the local groups map and the people carousel reserve
// their final size in the server render), and route changes jump rather than
// animate, so the browser's own fragment scroll lands and stays put.
export default function FooterYear() {
  useEffect(() => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear().toString();
  }, []);

  return null;
}
