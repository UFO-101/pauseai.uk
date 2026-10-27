"use client";

import { useFormStatus } from "react-dom";

/**
 * In a staff list's search form (a next/form Form): marked data-pending
 * while the form's search loads, as a StaffLink is, for the line along the
 * top of the page (StaffPage) if it takes a while.
 */
export default function FormPending() {
  const { pending } = useFormStatus();
  return <span hidden data-pending={pending || undefined} />;
}
