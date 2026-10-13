import type { LintIssue } from "@/lib/collateral/lint";

/** The automatic checks for a design, shown beside Download. */
export default function Checks({ issues, title = "Checks" }: { issues: LintIssue[]; title?: string }) {
  return (
    <div className="collateral-checks" role="status">
      <strong>{title}</strong>
      {issues.length === 0 ? (
        <p className="collateral-check is-ok">✓ No problems found.</p>
      ) : (
        <ul>
          {issues.map((issue) => (
            <li key={issue.id} className={`collateral-check is-${issue.level}`}>
              <span aria-hidden="true">{issue.level === "warn" ? "⚠" : "ℹ"}</span> {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
