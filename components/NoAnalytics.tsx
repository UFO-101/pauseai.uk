"use client";

import { useEffect } from "react";

export default function NoAnalytics() {
  useEffect(() => {
    document.body.setAttribute("data-no-analytics", "");
  }, []);
  return null;
}
