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
  return (
    <>
      {ask.bySupporters && <div>{copy.askedBy.supporters}</div>}
      {ask.byPauseai && <div>{copy.askedBy.pauseai}</div>}
    </>
  );
}

/**
 * Every ask, newest first: its title, kind and date, who asks it, a link to
 * the letter or the event, and how many politicians gave each answer its
 * kind allows, each count linked to the politicians who gave it. A link to
 * another site opens in a new tab.
 */
export default function AsksTable({ asks }: { asks: AskWithCounts[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <th>{copy.columns.ask}</th>
          <th>{copy.columns.kind}</th>
          <th>{copy.columns.date}</th>
          <th>{copy.columns.askedBy}</th>
          <th>{copy.columns.link}</th>
          <th>{copy.columns.answers}</th>
        </tr>
      </thead>
      <tbody>
        {asks.map((ask) => {
          const answers = ASK_STATUSES[ask.kind].filter((status) => ask.counts[status]);
          return (
            <tr key={ask.slug}>
              <td>{ask.title}</td>
              <td>{copy.kinds[ask.kind]}</td>
              <td>{ask.date && staffDate(ask.date)}</td>
              <td>
                <AskedBy ask={ask} />
              </td>
              <td>
                {ask.url &&
                  (ask.url.startsWith("/") ? (
                    <Link href={ask.url}>{copy.open[ask.kind]}</Link>
                  ) : (
                    <a href={ask.url} target="_blank" rel="noreferrer">
                      {copy.open[ask.kind]}
                    </a>
                  ))}
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
