"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FilterForm } from "@/components/ui/Form";
import styles from "./StaffForms.module.css";

/** The list at `action` with the form's filters, leaving out the blank ones. */
export function filterHref(action: string, form: HTMLFormElement): string {
  const params = new URLSearchParams();
  for (const [name, value] of new FormData(form)) if (value) params.set(name, value as string);
  const query = params.toString();
  return query ? `${action}?${query}` : action;
}

/**
 * A staff list's filters, a GET form, so the URL holds them. A select
 * applies as soon as it's changed; a search box waits for its button, or
 * Enter, so the list doesn't change under someone typing.
 */
export default function StaffFilters({ action, children }: { action: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <FilterForm
      method="get"
      action={action}
      className={styles.filters}
      onSubmit={(event) => {
        event.preventDefault();
        router.push(filterHref(action, event.currentTarget));
      }}
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) router.push(filterHref(action, event.currentTarget));
      }}
    >
      {children}
    </FilterForm>
  );
}
