import type React from "react";
import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import { waysKey, type Channel, type ContactPermission } from "@/lib/contact-permissions";
import { staffDate } from "@/lib/staff-time";
import Strip from "./ui/Strip";
import styles from "./PermissionTiles.module.css";

const copy = staffCopy.supporters.detail.permissions;

/** The short reason for an answer, with when and, for our forms', which form; the reason itself where the copy has no words for it. */
function reason(permission: ContactPermission): string {
  const words = copy.reasons[permission.topic]?.[permission.reason];
  const form = copy.forms[permission.source ?? ""] ?? copy.otherForm;
  return words ? words(permission.at ? staffDate(permission.at) : "", form) : permission.reason;
}

/** A topic's answer as a strip's colour: green we'd contact them, plain we wouldn't, amber we don't know. */
const TONES = { yes: "green", no: "plain", unsure: "amber" } as const;

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
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={copy[channel]}
      >
        {channel === "email" ? (
          <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </>
        ) : (
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        )}
      </svg>
      {address}
    </span>
  );
}

/**
 * One topic, a strip: its name and whether we'd contact them about it, in
 * the words of the ways it allows; under them the address or number it's
 * for, then why in a few words; how we know is behind the "?" at its top
 * right.
 */
function Tile({ permission }: { permission: ContactPermission }) {
  const id = `why-${permission.channel}-${permission.topic}-${permission.address.replace(/\W/g, "-")}`;
  const topic = copy.topics[permission.channel][permission.topic];
  const answer = copy.answers[waysKey(permission.channel, permission.topic)][permission.send];
  return (
    <li data-send={permission.send}>
      <Strip tone={TONES[permission.send]} icon={false}>
        <span className={styles.title}>
          <span className={styles.words}>
            <span>{topic}</span>
            <span className={styles.answer}>{answer}</span>
          </span>
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
      </Strip>
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

/** A blocked address: one red strip in place of its topics', since nothing goes to it. */
function Blocked({ permission }: { permission: ContactPermission }) {
  const because = copy.blockedBecause[permission.source ?? ""];
  return (
    <li data-send="no">
      <Strip tone="red">
        <span className={styles.title}>
          <span className={styles.words}>
            <span>{copy.everyTopic}</span>
            <span className={styles.answer}>{copy.blocked}</span>
          </span>
        </span>
        <Address channel="email" address={permission.address} />
        <span className={styles.reason}>
          {because && `${because(staffDate(permission.at!))} `}
          <Link href="/staff/supporters/blocked-emails">{copy.seeBlocked}</Link>
        </span>
      </Strip>
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
