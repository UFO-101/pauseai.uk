import { staffCopy } from "@/lib/content/staff-interface";
import type { ControlAiImport } from "@/lib/server/controlai-import";
import ResultBox from "./ResultBox";
import styles from "./staff.module.css";

/** The newest copy of ControlAI's letter's signatories: what it did, the names it couldn't place, or why it failed. */
export default function ControlAiImportStatus({ run }: { run?: ControlAiImport }) {
  if (!run) return <p>{staffCopy.controlAi.never}</p>;
  const { result } = run;
  const at = new Date(run.at).toLocaleString("en-GB");
  if (!result.ok) return <ResultBox error summary={staffCopy.controlAi.failed(at, result.error)} />;
  return (
    <ResultBox summary={staffCopy.controlAi.result(at, result)} lines={result.problems.length}>
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
    </ResultBox>
  );
}
