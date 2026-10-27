import type React from "react";
import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EmailPermission } from "@/lib/email-permissions";
import { staffDate } from "@/lib/staff-time";
import Strip from "./ui/Strip";
import styles from "./EmailPermissionTiles.module.css";

const copy = staffCopy.supporters.detail.permissions;

/** The short reason for an answer, with when; the reason itself where the copy has no words for it. */
function reason(permission: EmailPermission): string {
  const words = copy.reasons[permission.topic]?.[permission.reason];
  return words ? words(permission.at ? staffDate(permission.at) : "") : permission.reason;
}

/** A topic's answer as a strip's colour: green we'd email them, plain we wouldn't, amber we don't know. */
const TONES = { yes: "green", no: "plain", unsure: "amber" } as const;

/** One topic, a strip: its name and whether we'd email them about it, then why in a few words; how we know is behind the "?" at its top right. */
function Tile({ permission, address }: { permission: EmailPermission; address?: string }) {
  const id = `why-${permission.topic}-${permission.address.replace(/\W/g, "-")}`;
  return (
    <li data-send={permission.send}>
      <Strip tone={TONES[permission.send]} icon={false}>
        <span className={styles.title}>
          <span>
            {copy.topics[permission.topic]}
            {address && ` · ${address}`}: {copy[permission.send]}
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
function Blocked({ permission, address }: { permission: EmailPermission; address?: string }) {
  const because = copy.blockedBecause[permission.source ?? ""];
  return (
    <li data-send="no">
      <Strip tone="red">
        <span>
          {address && `${address}: `}
          {copy.blocked}
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
 * Whether we'd email a supporter about each topic, a strip each, for each
 * of their addresses; an address that's blocked gets one. The address is
 * named only when they have more than one.
 */
export default function EmailPermissionTiles({ permissions }: { permissions: EmailPermission[] }) {
  const addresses = [...new Set(permissions.map((p) => p.address))];
  const named = addresses.length > 1;
  return (
    <ul className={styles.list}>
      {addresses.flatMap((address) => {
        const own = permissions.filter((p) => p.address === address);
        const label = named ? address : undefined;
        const blocked = own.find((p) => p.reason === "blocked");
        if (blocked) return [<Blocked key={address} permission={blocked} address={label} />];
        return own.map((p) => <Tile key={`${address}-${p.topic}`} permission={p} address={label} />);
      })}
    </ul>
  );
}
