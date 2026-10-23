import Table from "@/components/ui/Table";
import { staffCopy } from "@/lib/content/staff-interface";
import type { ProblemSummary } from "@/lib/server/email";
import { staffTime } from "@/lib/staff-time";
import LetterLink from "./LetterLink";

/** The latest bounces and complaints, soft bounces too, and what each email was: a letter, linked to it with `letterLinks`. */
export default function EmailProblemsTable({
  problems,
  letterLinks,
}: {
  problems: ProblemSummary[];
  letterLinks: boolean;
}) {
  if (problems.length === 0) return <p>{staffCopy.emails.noProblems}</p>;
  const columns = staffCopy.emails.columns;
  return (
    <Table>
      <thead>
        <tr>
          <th>{columns.at}</th>
          <th>{columns.address}</th>
          <th>{columns.kind}</th>
          <th>{columns.reason}</th>
          <th>{columns.sent}</th>
        </tr>
      </thead>
      <tbody>
        {problems.map((problem) => (
          <tr key={problem.id}>
            <td>{staffTime(problem.at)}</td>
            <td>{problem.address}</td>
            <td>{staffCopy.emails.kinds[problem.kind]}</td>
            <td>{problem.reason}</td>
            <td>
              {problem.letter ? (
                <LetterLink letter={problem.letter} linked={letterLinks} />
              ) : (
                problem.purpose && staffCopy.emails.purposes[problem.purpose]
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
