import type React from "react";
import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import { CHANNELS, waysKey, type Channel, type ContactPermission, type Topic } from "@/lib/contact-permissions";
import { staffDate } from "@/lib/staff-time";
import ChannelIcon from "./ChannelIcon";
import Tag from "@/components/ui/Tag";
import styles from "./PermissionTiles.module.css";

const copy = staffCopy.supporters.detail.permissions;

/** The short reason for an answer, with when and, for our forms', which form; the reason itself where the copy has no words for it. */
function reason(permission: ContactPermission): string {
  const words = copy.reasons[permission.topic]?.[permission.reason];
  const form = copy.forms[permission.source ?? ""] ?? copy.otherForm;
  return words ? words(permission.at ? staffDate(permission.at) : "", form) : permission.reason;
}

/** An answer's colour, on it alone: green we'd contact them, amber we don't know, plain we wouldn't. */
const TONES = { yes: "green", unsure: "amber", no: undefined } as const;

/**
 * What's behind a row's "?": the topic's name, then for each channel it
 * has here, named when there's more than one, what it is, when we would
 * contact them and when not, in the words of the ways it allows, and, for
 * some, what we can't see, each under its label.
 */
function TopicDetails({ topic, channels, name }: { topic: Topic; channels: Channel[]; name: string }) {
  return (
    <>
      <strong className={styles.topicTitle}>{copy.topicTitle(name)}</strong>
      {channels.map((channel) => {
        const details = copy.details[channel][topic];
        const when = copy.when[waysKey(channel, topic)];
        return (
          <div key={channel} className={styles.channel}>
            {channels.length > 1 && (
              <p className={styles.channelName}>
                <ChannelIcon channel={channel} />
                {staffCopy.supporters.filters.channels[channel]}
              </p>
            )}
            <p>{details.about}</p>
            <dl className={styles.when}>
              <dt>{when.yes}</dt>
              <dd>{details.yes}</dd>
              <dt>{when.no}</dt>
              <dd>{details.no}</dd>
              {details.caveat && (
                <>
                  <dt>{copy.caveat}</dt>
                  <dd>{details.caveat}</dd>
                </>
              )}
            </dl>
          </div>
        );
      })}
    </>
  );
}

/**
 * The address or number a row is for, smaller, after a tiny envelope or
 * phone; a link to write or ring with `link`, as where we may contact them.
 */
function Address({ channel, address, link }: { channel: Channel; address: string; link: boolean }) {
  return (
    <span className={styles.address}>
      <ChannelIcon channel={channel} label={copy[channel]} />
      {link ? <a href={channel === "email" ? `mailto:${address}` : `tel:${address}`}>{address}</a> : address}
    </span>
  );
}

/**
 * One topic, a row: its name and the "?" with how we know; then each
 * address or number it has an answer for, by email before phone, with that
 * answer in its words and colour; then why, once if every answer has the
 * same reason, else under each.
 */
function TopicRow({ topic, permissions }: { topic: Topic; permissions: ContactPermission[] }) {
  const id = `why-${topic}`;
  const name = copy.topics[permissions[0].channel][topic];
  const reasons = permissions.map(reason);
  const shared = reasons.every((r) => r === reasons[0]);
  return (
    <li className={styles.item}>
      <span className={styles.head}>
        <span className={styles.topic}>{name}</span>
        <button
          type="button"
          className={styles.help}
          popoverTarget={id}
          aria-label={copy.why}
          style={{ anchorName: `--${id}` } as React.CSSProperties}
        >
          ?
        </button>
      </span>
      {permissions.map((permission, i) => (
        <span key={`${permission.channel}-${permission.address}`} className={styles.answer} data-send={permission.send}>
          <span className={styles.line}>
            <Address channel={permission.channel} address={permission.address} link={permission.send !== "no"} />
            <Tag tone={TONES[permission.send]}>{copy.answers[waysKey(permission.channel, topic)][permission.send]}</Tag>
          </span>
          {!shared && <span className={styles.reason}>{reasons[i]}</span>}
        </span>
      ))}
      {shared && <span className={styles.reason}>{reasons[0]}</span>}
      <div
        id={id}
        popover="auto"
        className={styles.popover}
        style={{ positionAnchor: `--${id}` } as React.CSSProperties}
      >
        <TopicDetails topic={topic} channels={[...new Set(permissions.map((p) => p.channel))]} name={name} />
      </div>
    </li>
  );
}

/** A blocked address: one row in place of its topics', its answer red, since nothing goes to it. */
function Blocked({ permission }: { permission: ContactPermission }) {
  const because = copy.blockedBecause[permission.source ?? ""];
  return (
    <li data-send="no" className={styles.item}>
      <span className={styles.head}>
        <span className={styles.topic}>{copy.everyTopic}</span>
        <Tag tone="red">{copy.blocked}</Tag>
      </span>
      <Address channel="email" address={permission.address} link={false} />
      <span className={styles.reason}>
        {because && `${because(staffDate(permission.at!))} `}
        <Link href="/staff/supporters/blocked-emails">{copy.seeBlocked}</Link>
      </span>
    </li>
  );
}

/** The topics in the order the rows go: ours first, then Luma's, then the rest. */
const ORDER: Topic[] = ["site-forms", "luma-calendar", "pauseai-updates", "volunteering", "march-day"];

/**
 * Whether we'd contact a supporter about each topic, a row each, every
 * address and number it has an answer for in it, email before phone; then
 * a row for each address that's blocked, which none of the topics' have.
 */
export default function PermissionTiles({ permissions }: { permissions: ContactPermission[] }) {
  const blocked = permissions.filter((p) => p.reason === "blocked");
  const out = new Set(blocked.map((p) => p.address));
  const open = permissions.filter((p) => !(p.channel === "email" && out.has(p.address)));
  const byChannel = (a: ContactPermission, b: ContactPermission) =>
    CHANNELS.indexOf(a.channel) - CHANNELS.indexOf(b.channel);
  return (
    <ul className={styles.list}>
      {ORDER.flatMap((topic) => {
        const own = open.filter((p) => p.topic === topic).sort(byChannel);
        return own.length > 0 ? [<TopicRow key={topic} topic={topic} permissions={own} />] : [];
      })}
      {[...new Map(blocked.map((p) => [p.address, p])).values()].map((p) => (
        <Blocked key={p.address} permission={p} />
      ))}
    </ul>
  );
}
