"use client";

import { useState, type ReactNode } from "react";
import styles from "./Gallery.module.css";

/**
 * Holds a controlled input's value, so the example works: dragging a slider
 * moves it, picking an option selects it. The value shows beside it.
 */
export function Controlled<T>({
  initial,
  show = (value) => JSON.stringify(value),
  children,
}: {
  initial: T;
  show?: (value: T) => string;
  children: (value: T, set: (value: T) => void) => ReactNode;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      {children(value, setValue)}
      <p className={styles.note}>Value: {show(value)}</p>
    </>
  );
}

/**
 * How an argument reads in the event log: a file by its name, a form's data
 * as its fields (what a Server Action would get), a DOM event as "event", the
 * rest as JSON.
 */
function describe(arg: unknown): string {
  if (arg instanceof File) return `File ${arg.name}`;
  if (arg instanceof FormData) return JSON.stringify(Object.fromEntries(arg));
  if (arg instanceof Event || (typeof arg === "object" && arg !== null && "nativeEvent" in arg)) return "event";
  if (typeof arg === "function") return "ƒ";
  try {
    return JSON.stringify(arg) ?? String(arg);
  } catch {
    return String(arg);
  }
}

/**
 * Gives an example's action callbacks something to do: `log("onSave")` is a
 * function that adds "onSave(…)" to a list under the component.
 */
export function Logged({ children }: { children: (log: (name: string) => (...args: unknown[]) => void) => ReactNode }) {
  const [calls, setCalls] = useState<string[]>([]);
  const log =
    (name: string) =>
    (...args: unknown[]) =>
      setCalls((list) => [...list, `${name}(${args.map(describe).join(", ")})`]);
  return (
    <>
      {children(log)}
      <ol className={styles.log} aria-label="Event log">
        {calls.map((call, i) => (
          <li key={i}>{call}</li>
        ))}
      </ol>
    </>
  );
}
