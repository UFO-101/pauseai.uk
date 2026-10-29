"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useMarchSignups } from "./signups";

const SignupsContext = createContext<number | null>(null);

/** How many have registered, from the MarchSignups around it: null outside one, or when Luma can't say. */
export function useSignups(): number | null {
  return useContext(SignupsContext);
}

/**
 * The march's count for everything in it, so the hero and the form show the
 * same one: `signups`, the count the page was rendered with, kept up to date
 * by `load` (app/api/march/signups unless a test gives one) while the page is
 * open (useMarchSignups).
 */
export default function MarchSignups({
  signups,
  load,
  children,
}: {
  signups: number | null;
  load?: () => Promise<number | null>;
  children: ReactNode;
}) {
  const count = useMarchSignups(signups, load);
  return <SignupsContext value={count}>{children}</SignupsContext>;
}
