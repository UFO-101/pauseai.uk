// Reads the staff pages' URLs: each filter as typed, for its form, and what
// it filters by, leaving out anything blank or unknown. lib/staff-forms.ts
// reads their forms.
import { staffCopy } from "@/lib/content/staff-interface";
import { isImportJob, type ImportJob } from "@/lib/import-runs";

/** The import history's job filter. */
export function historySearch({ job = "" }: { job?: string }): { job: string; filter?: ImportJob } {
  return { job, filter: isImportJob(job) ? job : undefined };
}

/** The letters page's status filter. */
export function lettersSearch({ status = "" }: { status?: string }): { status: string; filter?: string } {
  return { status, filter: Object.hasOwn(staffCopy.letters.status, status) ? status : undefined };
}

/** A politician's ID from their page's URL: a whole number, or undefined. */
export function politicianId(id: string): number | undefined {
  return /^\d+$/.test(id) ? Number(id) : undefined;
}
