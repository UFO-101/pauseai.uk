/** Counts by mailing, or a form letter's campaign, as a list under its heading; nothing with none. */
export default function CountsByMailing({
  heading,
  counts,
  titles,
}: {
  heading: string;
  counts: Record<string, number>;
  titles?: Record<string, string>;
}) {
  const rows = Object.entries(counts).filter(([, n]) => n > 0);
  if (rows.length === 0) return null;
  return (
    <>
      <h4>{heading}</h4>
      <ul>
        {rows.map(([key, n]) => (
          <li key={key}>
            {titles?.[key] ?? key}: {n}
          </li>
        ))}
      </ul>
    </>
  );
}
