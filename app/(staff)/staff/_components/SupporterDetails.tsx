import Link from "next/link";
import Table from "@/components/ui/Table";
import { Muted } from "@/components/ui/Text";
import { campaignBySlug } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffDate, staffTime } from "@/lib/staff-time";
import type { SupporterActivity, SupporterDetails as Details } from "@/lib/supporters";
import SupporterBadges from "./SupporterBadges";
import styles from "./SupporterDetails.module.css";

/** What an activity was about: the event, the campaign, or the list. */
function activityTitle(item: SupporterActivity): string | null {
  if (item.kind === "letter" || item.kind === "letter-replied") {
    return campaignBySlug(item.title ?? "")?.title ?? item.title;
  }
  if (item.kind === "opted-out" || item.kind === "resubscribed") {
    return staffCopy.supporters.lists[item.title ?? ""] ?? item.title;
  }
  return item.title;
}

/** How it went: a registration's status in our words; otherwise as the source said. */
function activityDetail(item: SupporterActivity): string | null {
  if (item.kind === "luma-registered") return staffCopy.supporters.detail.statuses[item.detail ?? ""] ?? item.detail;
  return item.detail;
}

/** A supporter's page: who they are, how we know them, what they gave us, and what they did. */
export default function SupporterDetails({ supporter }: { supporter: Details }) {
  const copy = staffCopy.supporters;
  const { summary, identities, contacts, links, activity, optOuts } = supporter;
  return (
    <>
      <h1>
        {summary.name ?? copy.noName} <SupporterBadges supporter={summary} />
      </h1>

      <h2>{copy.detail.identitiesTitle}</h2>
      <ul>
        {identities.map((identity, i) => (
          <li key={i}>
            {identity.name || copy.noName} · {identity.email}{" "}
            <Muted>
              {copy.detail.identity(copy.sources[identity.source], identity.seenAt ? staffDate(identity.seenAt) : "")}
            </Muted>
          </li>
        ))}
      </ul>

      <h2>{copy.detail.contactsTitle}</h2>
      {contacts.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th>{copy.detail.contactColumns.when}</th>
              <th>{copy.detail.contactColumns.source}</th>
              <th>{copy.detail.contactColumns.phone}</th>
              <th>{copy.detail.contactColumns.postcode}</th>
              <th>{copy.detail.contactColumns.place}</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact, i) => (
              <tr key={i}>
                <td>{staffDate(contact.at)}</td>
                <td>{copy.sources[contact.source]}</td>
                <td>{contact.phone}</td>
                <td>{contact.postcode}</td>
                <td>{contact.latitude !== null && `${contact.latitude}, ${contact.longitude}`}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <h2>{copy.detail.linksTitle}</h2>
      <ul>
        {links.map((link) => (
          <li key={`${link.source}-${link.sourceId}`}>
            {copy.detail.link(copy.sources[link.source], link.sourceId, link.matchedValue)}{" "}
            <Muted>{staffTime(link.linkedAt)}</Muted>
          </li>
        ))}
      </ul>

      <h2>{copy.detail.optOutsTitle}</h2>
      <ul aria-label={copy.detail.optOutsTitle}>
        {optOuts.map((optOut) => (
          <li key={`${optOut.list}-${optOut.address}`}>
            {copy.lists[optOut.list]} · {optOut.address}:{" "}
            {optOut.since === null ? (
              <Muted>{copy.detail.notOptedOut}</Muted>
            ) : (
              copy.detail.optedOut(staffTime(optOut.since), optOut.source ?? "")
            )}
          </li>
        ))}
      </ul>

      <h2>{copy.detail.activityTitle}</h2>
      {activity.length === 0 ? (
        <p>{copy.detail.noActivity}</p>
      ) : (
        <ol className={styles.activity} aria-label={copy.detail.activityTitle}>
          {activity.map((item, i) => {
            const title = activityTitle(item);
            const detail = activityDetail(item);
            return (
              <li key={i}>
                <Muted>{staffTime(item.at)}</Muted> {copy.detail.kinds[item.kind]}
                {title && <>: {item.href ? <Link href={item.href}>{title}</Link> : title}</>}
                {detail && <Muted> · {detail}</Muted>}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
