import { staffCopy } from "@/lib/content/staff-interface";
import type { MpProblem } from "@/lib/mp-check";
import type { MpCheck } from "@/lib/server/mp-check";
import RunBox from "./RunBox";
import styles from "./staff.module.css";

/** What each side says, for one problem. */
function sides(problem: MpProblem): [string, string] {
  switch (problem.kind) {
    case "missing":
      return ["", problem.parliament];
    case "extra":
    case "unofficial":
      return [problem.airtable, ""];
    case "name":
      return [problem.airtable, problem.parliament];
    case "email":
      return [`${problem.name}: ${problem.airtable ?? staffCopy.check.noEmail}`, problem.parliament.join(", ")];
  }
}

function Check({ run }: { run: MpCheck }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} />;
  const { problems } = run.result;
  const count = problems.length;
  return (
    <RunBox run={run} lines={count} summary={count === 0 ? staffCopy.check.allGood : staffCopy.check.problems(count)}>
      {count > 0 && (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{staffCopy.check.columns.constituency}</th>
                <th>{staffCopy.check.columns.problem}</th>
                <th>{staffCopy.check.columns.airtable}</th>
                <th>{staffCopy.check.columns.parliament}</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => {
                const [airtable, parliament] = sides(problem);
                return (
                  <tr key={`${problem.constituency} ${problem.kind}`}>
                    <td>{problem.constituency}</td>
                    <td>{staffCopy.check.kinds[problem.kind]}</td>
                    <td>{airtable}</td>
                    <td>{parliament}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </RunBox>
  );
}

/** Recent checks of Airtable's MPs against Parliament's, a box each: where they disagree, or why the check failed. */
export default function MpCheckList({ runs }: { runs: MpCheck[] }) {
  if (runs.length === 0) return <p>{staffCopy.check.never}</p>;
  return runs.map((run) => <Check key={run.id} run={run} />);
}
