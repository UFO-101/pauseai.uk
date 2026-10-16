import { staffCopy } from "@/lib/content/staff-interface";
import type { ControlAiImport } from "@/lib/server/controlai-import";
import RunBox from "./RunBox";
import styles from "./staff.module.css";

function Import({ run }: { run: ControlAiImport }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} />;
  const { result } = run;
  return (
    <RunBox run={run} summary={staffCopy.controlAi.result(result)} lines={result.problems.length}>
      {result.problems.length > 0 && (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{staffCopy.controlAi.columns.name}</th>
                <th>{staffCopy.controlAi.columns.problem}</th>
              </tr>
            </thead>
            <tbody>
              {result.problems.map((problem) => (
                <tr key={problem.name}>
                  <td>{problem.name}</td>
                  <td>
                    {staffCopy.controlAi.kinds[problem.kind]}
                    {problem.candidates.length > 0 && (
                      <span className={styles.muted}> {problem.candidates.join(", ")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RunBox>
  );
}

/** Recent copies of ControlAI's letter's signatories, a box each: what it did, the names it couldn't place, or why it failed. */
export default function ControlAiImportList({ runs }: { runs: ControlAiImport[] }) {
  if (runs.length === 0) return <p>{staffCopy.controlAi.never}</p>;
  return runs.map((run) => <Import key={run.id} run={run} />);
}
