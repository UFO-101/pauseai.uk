import type React from "react";
import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { ContactPermission } from "@/lib/contact-permissions";
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

/** A topic's name and an answer, in the words of its channel. */
function words(permission: ContactPermission): { topic: string; answer: string } {
  if (permission.channel === "email") return { topic: copy.topics[permission.topic], answer: copy[permission.send] };
  const answers = { yes: copy.phoneYes, no: copy.phoneNo, unsure: copy.unsure };
  return { topic: copy.phoneTopics[permission.topic], answer: answers[permission.send] };
}

/**
 * One topic, a strip: its name, the address or number it's for, and
 * whether we'd contact them about it, then why in a few words; how we know
 * is behind the "?" at its top right.
 */
function Tile({ permission }: { permission: ContactPermission }) {
  const id = `why-${permission.channel}-${permission.topic}-${permission.address.replace(/\W/g, "-")}`;
  const { topic, answer } = words(permission);
  return (
    <li data-send={permission.send}>
      <Strip tone={TONES[permission.send]} icon={false}>
        <span className={styles.title}>
          <span>
            {topic} · {permission.address}: {answer}
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
        <span className={styles.reason}>{reason(permission)}</span>
      </Strip>
      <div
        id={id}
        popover="auto"
        className={styles.popover}
        style={{ positionAnchor: `--${id}` } as React.CSSProperties}
      >
        {copy.details[permission.topic]}
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
        <span>
          {permission.address}: {copy.blocked}
        </span>
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
