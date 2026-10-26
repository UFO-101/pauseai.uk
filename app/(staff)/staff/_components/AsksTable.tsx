import Link from "next/link";
import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AskWithCounts } from "@/lib/server/asks";
import { staffDate } from "@/lib/staff-time";
import Table from "@/components/ui/Table";
import { Muted } from "@/components/ui/Text";

const copy = staffCopy.asks;

/** Who asks it: supporters, PauseAI, or both, a line each. */
function AskedBy({ ask }: { ask: AskWithCounts }) {
  return ask.askedBy.map((asker) => <div key={asker}>{copy.askedBy[asker]}</div>);
}

/** An ask's title, linked to the letter or the event if we know where it is. A link to another site opens in a new tab. */
function Title({ ask }: { ask: AskWithCounts }) {
  if (!ask.url) return ask.title;
  return ask.url.startsWith("/") ? (
    <Link href={ask.url}>{ask.title}</Link>
  ) : (
    <a href={ask.url} target="_blank" rel="noreferrer">
      {ask.title}
    </a>
  );
}

/**
 * Every ask, newest first: its kind, title and date, who asks it, and how
 * many politicians gave each answer its kind allows, each count linked to
 * the politicians who gave it.
 */
export default function AsksTable({ asks }: { asks: AskWithCounts[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <th>{copy.columns.kind}</th>
          <th>{copy.columns.ask}</th>
          <th>{copy.columns.date}</th>
          <th>{copy.columns.askedBy}</th>
          <th>{copy.columns.answers}</th>
        </tr>
      </thead>
      <tbody>
        {asks.map((ask) => {
          const answers = ASK_STATUSES[ask.kind].filter((status) => ask.counts[status]);
          return (
            <tr key={ask.slug}>
              <td>{copy.kinds[ask.kind]}</td>
              <td>
                <Title ask={ask} />
              </td>
              <td>{ask.date && staffDate(ask.date)}</td>
              <td>
                <AskedBy ask={ask} />
              </td>
              <td>
                {answers.length === 0 ? (
                  <Muted>{copy.noAnswers}</Muted>
                ) : (
                  answers.map((status, i) => (
                    <span key={status}>
                      {i > 0 && " · "}
                      <Link href={`/staff/politicians?ask=${ask.slug}&answer=${status}`}>
                        {copy.count(staffCopy.statuses[status], ask.counts[status]!)}
                      </Link>
                    </span>
                  ))
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
