import type React from "react";
import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import { waysKey, type Channel, type ContactPermission } from "@/lib/contact-permissions";
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
 * What's behind a strip's "?": the topic's name, what it is, then when we
 * would contact them and when not, in the words of the ways it allows, and,
 * for some, what we can't see, each under its label.
 */
function TopicDetails({ permission, topic }: { permission: ContactPermission; topic: string }) {
  const details = copy.details[permission.channel][permission.topic];
  const when = copy.when[waysKey(permission.channel, permission.topic)];
  return (
    <>
      <strong className={styles.topicTitle}>{copy.topicTitle(topic)}</strong>
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
    </>
  );
}

/** The address or number a strip is for, smaller, after a tiny envelope or phone. */
function Address({ channel, address }: { channel: Channel; address: string }) {
  return (
    <span className={styles.address}>
      <ChannelIcon channel={channel} label={copy[channel]} />
      {address}
    </span>
  );
}

/**
 * One topic, a row: its name, then whether we'd contact them about it, in
 * the words of the ways it allows, a lozenge in the answer's colour, and
 * the "?" with how we know; under them the address or number it's for,
 * then why in a few words.
 */
function Tile({ permission }: { permission: ContactPermission }) {
  const id = `why-${permission.channel}-${permission.topic}-${permission.address.replace(/\W/g, "-")}`;
  const topic = copy.topics[permission.channel][permission.topic];
  const answer = copy.answers[waysKey(permission.channel, permission.topic)][permission.send];
  return (
    <li data-send={permission.send} className={styles.item}>
      <span className={styles.head}>
        <span className={styles.topic}>{topic}</span>
        <Tag tone={TONES[permission.send]}>{answer}</Tag>
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
      <Address channel={permission.channel} address={permission.address} />
      <span className={styles.reason}>{reason(permission)}</span>
      <div
        id={id}
        popover="auto"
        className={styles.popover}
        style={{ positionAnchor: `--${id}` } as React.CSSProperties}
      >
        <TopicDetails permission={permission} topic={topic} />
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
      <Address channel="email" address={permission.address} />
      <span className={styles.reason}>
        {because && `${because(staffDate(permission.at!))} `}
        <Link href="/staff/supporters/blocked-emails">{copy.seeBlocked}</Link>
      </span>
    </li>
  );
}

/**
 * Whether we'd contact a supporter about each topic, a strip each, for each
 * of their addresses, then each of their numbers, each strip naming the one
 * it's for; an address that's blocked gets one.
 */
export default function PermissionTiles({ permissions }: { permissions: ContactPermission[] }) {
  const keys = [...new Set(permissions.map((p) => `${p.channel} ${p.address}`))];
  return (
    <ul className={styles.list}>
      {keys.flatMap((key) => {
        const own = permissions.filter((p) => `${p.channel} ${p.address}` === key);
        const blocked = own.find((p) => p.reason === "blocked");
        if (blocked) return [<Blocked key={key} permission={blocked} />];
        return own.map((p) => <Tile key={`${key}-${p.topic}`} permission={p} />);
      })}
    </ul>
  );
}
