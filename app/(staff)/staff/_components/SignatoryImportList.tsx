import { staffCopy } from "@/lib/content/staff-interface";
import type { SignatoryImport } from "@/lib/server/signatory-import";
import RunBox from "./RunBox";

/** Recent copies of the signatories from Airtable, a box each: the counts, or why it failed. */
export default function SignatoryImportList({ runs }: { runs: SignatoryImport[] }) {
  if (runs.length === 0) return <p>{staffCopy.import.none}</p>;
  return runs.map((run) => (
    <RunBox key={run.id} run={run} summary={run.status === "failed" ? null : staffCopy.import.result(run.result)} />
  ));
}
