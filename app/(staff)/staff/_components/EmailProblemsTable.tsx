import Table from "@/components/ui/Table";
import { staffCopy } from "@/lib/content/staff-interface";
import type { ProblemSummary } from "@/lib/server/email";
import { staffTime } from "@/lib/staff-time";

/** The latest bounces and complaints, soft bounces too, and what each email was. */
export default function EmailProblemsTable({ problems }: { problems: ProblemSummary[] }) {
  if (problems.length === 0) return <p>{staffCopy.emails.none}</p>;
  const columns = staffCopy.emails.columns;
  return (
    <Table>
      <thead>
        <tr>
          <th>{columns.at}</th>
          <th>{columns.address}</th>
          <th>{columns.kind}</th>
          <th>{columns.reason}</th>
          <th>{columns.email}</th>
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
              {problem.letterId
                ? staffCopy.emails.letter(problem.letterId)
                : problem.purpose && staffCopy.emails.purposes[problem.purpose]}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
