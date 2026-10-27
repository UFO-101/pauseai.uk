"use client";

import { useFormStatus } from "react-dom";

/**
 * In a staff list's search form (a next/form Form): marked data-pending
 * while the form's search loads, as a ListLink is, which dims the list.
 */
export default function FormPending() {
  const { pending } = useFormStatus();
  return <span hidden data-pending={pending || undefined} />;
}
