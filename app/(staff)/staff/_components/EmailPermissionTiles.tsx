import type React from "react";
import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EmailPermission } from "@/lib/email-permissions";
import { staffDate } from "@/lib/staff-time";
import styles from "./EmailPermissionTiles.module.css";

const copy = staffCopy.supporters.detail.permissions;

/** The short reason for an answer, with when; the reason itself where the copy has no words for it. */
function reason(permission: EmailPermission): string {
  const words = copy.reasons[permission.topic]?.[permission.reason];
  return words ? words(permission.at ? staffDate(permission.at) : "") : permission.reason;
}

/** One topic: whether we'd email them about it, large, then why in a few words; how we know is behind the "?" by its name. */
function Tile({ permission, address }: { permission: EmailPermission; address?: string }) {
  const id = `why-${permission.topic}-${permission.address.replace(/\W/g, "-")}`;
  return (
    <li className={styles.tile} data-send={permission.send}>
      <span className={styles.topic}>
        {copy.topics[permission.topic]}
        {address && ` · ${address}`}
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
      <strong className={styles.answer}>{copy[permission.send]}</strong>
      <span className={styles.reason}>{reason(permission)}</span>
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

/** A blocked address: one tile in place of its topics', since nothing goes to it. */
function Blocked({ permission, address }: { permission: EmailPermission; address?: string }) {
  const because = copy.blockedBecause[permission.source ?? ""];
  return (
    <li className={`${styles.tile} ${styles.wide}`} data-send="no">
      {address && <span className={styles.topic}>{address}</span>}
      <strong className={styles.answer}>{copy.blocked}</strong>
      <span className={styles.reason}>
        {because && `${because(staffDate(permission.at!))} `}
        <Link href="/staff/blocked-emails">{copy.seeBlocked}</Link>
      </span>
    </li>
  );
}

/**
 * Whether we'd email a supporter about each topic, a tile each, for each
 * of their addresses; an address that's blocked gets one tile. The address
 * is named only when they have more than one.
 */
export default function EmailPermissionTiles({ permissions }: { permissions: EmailPermission[] }) {
  const addresses = [...new Set(permissions.map((p) => p.address))];
  const named = addresses.length > 1;
  return (
    <ul className={styles.tiles}>
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
