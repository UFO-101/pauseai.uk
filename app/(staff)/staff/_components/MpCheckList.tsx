import { staffCopy } from "@/lib/content/staff-interface";
import type { MpProblem } from "@/lib/mp-check";
import ResultBox from "./ResultBox";
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

/** Where Airtable's MPs disagree with Parliament's, from the newest check. */
export default function MpCheckList({ check }: { check?: { at: string; problems: MpProblem[] } }) {
  if (!check) return <p>{staffCopy.check.never}</p>;
  const at = new Date(check.at).toLocaleString("en-GB");
  const count = check.problems.length;
  return (
    <ResultBox
      lines={count}
      summary={
        <>
          {staffCopy.check.checkedAt(at)}
          <span className={styles.muted}>
            {" "}
            · {count === 0 ? staffCopy.check.allGood : staffCopy.check.problems(count)}
          </span>
        </>
      }
    >
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
              {check.problems.map((problem) => {
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
    </ResultBox>
  );
}
