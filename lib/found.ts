import { notFound } from "next/navigation";

/**
 * The value, or a 404 if there isn't one: how a page finds the post, person
 * or record its URL names, without a branch of its own (pages have none;
 * tests/checks/thin-pages.test.ts).
 */
export function found<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) notFound();
  return value;
}
