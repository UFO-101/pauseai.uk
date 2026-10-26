import Link from "next/link";
import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AskWithCounts } from "@/lib/server/asks";
import { staffDate } from "@/lib/staff-time";
import Table from "@/components/ui/Table";
import { Muted } from "@/components/ui/Text";

const copy = staffCopy.asks;

/**
 * Every ask: its title, kind and date, and how many politicians gave each
 * answer its kind allows, each count linked to the politicians who gave it.
 */
export default function AsksTable({ asks }: { asks: AskWithCounts[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <th>{copy.columns.ask}</th>
          <th>{copy.columns.kind}</th>
          <th>{copy.columns.date}</th>
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
