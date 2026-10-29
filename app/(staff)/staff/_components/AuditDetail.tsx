import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffDate } from "@/lib/staff-time";
import type { FieldChange } from "@/lib/field-changes";
import { importPath } from "@/lib/import-runs";
import type { LoggedChange, Named } from "@/lib/server/audit";
import CampaignName from "./CampaignName";
import { DotParts } from "./Logged";

const copy = staffCopy.changes;

/** A field's name, in bold before its value; one with no name in the copy, as logged, with a capital. */
function label(key: string): string {
  return (
    staffCopy.fields[key as keyof typeof staffCopy.fields] ?? copy.labels[key] ?? key[0].toUpperCase() + key.slice(1)
  );
}

/** Permissions as their names, or that there are none. */
function permissionNames(value: unknown): string {
  const list = value as string[];
  return list.length ? list.map((p) => staffCopy.accounts.names[p] ?? p).join(", ") : copy.noPermissions;
}

/** A value as words: a house, a kind of problem, a status or a campaign by name; anything else as it is. */
function Value({ name, value }: { name: string; value: unknown }) {
  if (value === null) return <Muted>{copy.empty}</Muted>;
  if (name === "house") return <>{staffCopy.houses[value as string] ?? String(value)}</>;
  if (name === "campaign") return <CampaignName slug={String(value)} />;
  if (typeof value === "string") return <>{value}</>;
  return <>{JSON.stringify(value)}</>;
}

/** What an edit changed: each field, before and after. */
export function FieldChanges({ changed }: { changed: Record<string, FieldChange> }) {
  return (
    <DotParts>
      {Object.entries(changed).map(([name, [before, after]]) => (
        <Fragment key={name}>
          <strong>{label(name)}</strong> <Value name={name} value={before} /> → <Value name={name} value={after} />
        </Fragment>
      ))}
    </DotParts>
  );
}

/** Someone the entry is about: their name linked to their page while they're here; otherwise the name it gave, or their ID. */
function Who({ named, href, name, id }: { named: Named | null; href: string; name: string; id: unknown }) {
  const shown = named?.name || name || copy.gone(String(named?.id ?? id));
  return named ? <Link href={`${href}/${named.id}`}>{shown}</Link> : <>{shown}</>;
}

/**
 * One logged field, labelled, in words: an Airtable ID linked to the
 * record, permissions by name, a count by what it counted, and the rest
 * as they are.
 */
function Field({ name, value, airtableTable }: { name: string; value: unknown; airtableTable: string }) {
  if (typeof value === "number") {
    return (
      <>
        {value} {copy.counts[name]?.(value) ?? name}
      </>
    );
  }
  let shown: ReactNode;
  if (name === "airtableId") {
    shown = (
      <a href={`${airtableTable}/${String(value)}`} target="_blank" rel="noreferrer">
        {String(value)}
      </a>
    );
  } else if (name === "kind") shown = staffCopy.emails.kinds[String(value)] ?? String(value);
  else if (name === "status") shown = staffCopy.statuses[String(value)] ?? String(value);
  else if (name === "from" || name === "to" || name === "permissions") shown = permissionNames(value);
  else if (name === "changed") return <FieldChanges changed={value as Record<string, FieldChange>} />;
  else shown = <Value name={name} value={value} />;
  return (
    <>
      <strong>{label(name)}</strong> {shown}
    </>
  );
}

/**
 * What an entry of the audit log says, in words: first whom or what it's
 * about, linked where there's a page, then every other field it logged,
 * labelled, leaving out those with nothing in them (a null date, an empty
 * note). `airtableTable` is the table an Airtable ID is a record of.
 */
export default function AuditDetail({ change, airtableTable }: { change: LoggedChange; airtableTable: string }) {
  const { details } = change;
  const used = new Set<string>();
  const take = (...keys: string[]) => keys.forEach((key) => used.add(key));
  const text = (key: string) => (typeof details[key] === "string" ? (details[key] as string) : "");
  const lead: ReactNode[] = [];
  switch (change.action) {
    case "set status":
    case "add politician":
    case "edit politician":
    case "remove politician":
    case "delete politician":
      take("politicianId", "id", "name");
      lead.push(
        <Who
          named={change.politician}
          href="/staff/politicians"
          name={text("name")}
          id={details.politicianId ?? details.id}
        />,
      );
      break;
    case "view supporter":
      take("id");
      lead.push(<Who named={change.supporter} href="/staff/supporters" name="" id={details.id} />);
      break;
    case "erase supporter":
      take("id");
      lead.push(copy.gone(String(details.id)));
      break;
    // Logged by the politician sync, or before it read every body, the MP sync.
    case "apply held politician sync":
    case "discard held politician sync":
    case "apply held MP sync":
    case "discard held MP sync":
      take("id");
      lead.push(<Link href={importPath("sync-politicians")}>{copy.run(String(details.id))}</Link>);
      break;
    case "add staff account":
    case "set staff permissions":
    case "remove staff account":
    case "block address":
    case "unblock address":
      take("email", "address");
      lead.push(text("email") || text("address"));
      break;
  }
  if (change.action === "set status") {
    take("status", "ask", "campaign", "date");
    const words =
      details.status === null
        ? staffCopy.politician.statusCleared
        : staffCopy.politician.statusSet(staffCopy.statuses[text("status")] ?? text("status"));
    lead.push(
      <>
        {words.before}
        {/* By ask's slug, or, logged before asks, by campaign. */}
        {details.ask ? text("ask") : <CampaignName slug={text("campaign")} />}
        {words.after}
        {text("date") && `, ${staffDate(text("date"))}`}
      </>,
    );
  }
  if (change.action === "set staff permissions") {
    take("from", "to");
    lead.push(`${permissionNames(details.from)} → ${permissionNames(details.to)}`);
  }
  // Leaving out what has nothing in it: an empty note, a null date, a change of nothing. An empty list
  // says something ("No permissions"), so it stays.
  const empty = (value: unknown) =>
    value === null ||
    value === "" ||
    (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0);
  const rest = Object.entries(details).filter(([key, value]) => !used.has(key) && !empty(value));
  return (
    <DotParts>
      {[
        ...lead,
        ...rest.map(([key, value]) => <Field key={key} name={key} value={value} airtableTable={airtableTable} />),
      ]}
    </DotParts>
  );
}
