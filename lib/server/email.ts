import "server-only";
import { logChange } from "./audit";
import { query, transaction } from "./db";
import { PostmarkError, sendEmail, unsuppress, type Email } from "./outside-services/postmark";

// Every email the site sends goes through send(), whatever it's for. A bounce
// or complaint is about an address, not about the email that found it out:
// once an address hard-bounces or complains, nothing is sent to it again
// until staff unblock it. The provider (lib/server/outside-services/postmark.ts) is behind
// sendEmail and unsuppress, and its webhooks become a DeliveryProblem.

/** What an email is for. Each has its own way of handling a bounce (delivery-problems.ts). */
export type Purpose = "letter" | "forwarded-reply" | "staff-login" | "staff-alert";

export type SendResult = { sent: true; id: string } | { sent: false; reason: "blocked" | "failed" };

/** A bounce or spam complaint, as any provider reports it. */
export type DeliveryProblem = {
  address: string;
  /** The email it was about, if the provider said. */
  messageId: string | null;
  /** A hard bounce or complaint blocks the address. */
  kind: "hard" | "soft" | "complaint";
  /** The provider's own words. */
  reason: string;
  /** Whether the provider will send to the address again if asked. */
  canReset: boolean;
  details?: object;
};

/** Who the audit log says blocked an address. */
const PROVIDER = "postmark";

/** The bare address in a To header, lowercased: `"Jane" <Jane@example.org>` is jane@example.org. */
export function bareAddress(to: string): string {
  return (/<([^>]*)>\s*$/.exec(to)?.[1] ?? to).trim().toLowerCase();
}

export async function isBlocked(address: string): Promise<boolean> {
  const [row] = await query("SELECT 1 FROM email_blocks WHERE address = $1", [bareAddress(address)]);
  return !!row;
}

/**
 * Sends an email, unless its address is blocked. The provider refusing an
 * address it suppressed blocks it here too. Every try is logged in
 * email_sends; a failure is logged to the console as well. Never throws for
 * the provider: callers decide what to tell people.
 */
export async function send(email: Email, purpose: Purpose, letterId: number | null = null): Promise<SendResult> {
  const address = bareAddress(email.To);
  const log = (outcome: "sent" | "refused" | "failed", messageId: string | null = null) =>
    query("INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id) VALUES ($1, $2, $3, $4, $5)", [
      purpose,
      letterId,
      address,
      outcome,
      messageId,
    ]);
  if (await isBlocked(address)) {
    await log("refused");
    return { sent: false, reason: "blocked" };
  }
  let id: string;
  try {
    id = await sendEmail(email);
  } catch (error) {
    if (error instanceof PostmarkError && error.inactive) {
      await recordProblem({ address, messageId: null, kind: "hard", reason: error.message, canReset: true });
      await log("refused");
      return { sent: false, reason: "blocked" };
    }
    console.error(`Couldn't send an email (${purpose}):`, error);
    await log("failed");
    return { sent: false, reason: "failed" };
  }
  await log("sent", id);
  return { sent: true, id };
}

/**
 * Records a bounce or complaint. A hard bounce or complaint blocks the
 * address, or a complaint takes over a bounce's block, as it can't be reset;
 * the audit log says so. Returns whether it blocked the address.
 */
export async function recordProblem(problem: DeliveryProblem): Promise<boolean> {
  const address = bareAddress(problem.address);
  const canReset = problem.kind !== "complaint" && problem.canReset;
  return transaction(async (db) => {
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO email_problems (address, message_id, kind, reason, can_reset, details)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::int AS id`,
      [address, problem.messageId, problem.kind, problem.reason, canReset, JSON.stringify(problem.details ?? {})],
      db,
    );
    if (problem.kind === "soft") return false;
    const blocked = await query(
      `INSERT INTO email_blocks (address, problem_id) VALUES ($1, $2)
       ON CONFLICT (address) DO UPDATE SET problem_id = EXCLUDED.problem_id
       WHERE $3 AND (SELECT kind FROM email_problems WHERE id = email_blocks.problem_id) <> 'complaint'
       RETURNING address`,
      [address, id, problem.kind === "complaint"],
      db,
    );
    if (blocked.length) await logChange(PROVIDER, "block address", { address, kind: problem.kind }, db);
    return blocked.length > 0;
  });
}

/**
 * Unblocks an address: asks the provider to send to it again, then deletes
 * its block, and logs who did it and why. Refused without a note of why
 * (the audit log refuses one too), and for a complaint, which only the
 * person can undo. Returns whether it was unblocked.
 */
export async function unblock(address: string, staff: string, note: string): Promise<boolean> {
  if (!note.trim()) return false;
  const [block] = await query<{ canReset: boolean }>(
    `SELECT p.can_reset AS "canReset" FROM email_blocks b JOIN email_problems p ON p.id = b.problem_id WHERE b.address = $1`,
    [address],
  );
  if (!block?.canReset) return false;
  await unsuppress(address);
  return transaction(async (db) => {
    const deleted = await query("DELETE FROM email_blocks WHERE address = $1 RETURNING address", [address], db);
    if (deleted.length) await logChange(staff, "unblock address", { address, note }, db);
    return deleted.length > 0;
  });
}

/** A blocked address, for the staff interface. */
export type EmailBlock = {
  address: string;
  kind: "hard" | "complaint";
  reason: string;
  /** When the problem that blocked it came. */
  since: string;
  canReset: boolean;
  /** The politicians with this address. */
  politicians: { id: number; name: string }[];
  /** The letter whose email found it out, if one did, and the politician it was to. */
  letter: SentLetter | null;
  /** Emails not sent to it since. */
  refused: number;
};

const SELECT_BLOCKS = `
  SELECT b.address, p.kind, p.reason, p.at AS since, p.can_reset AS "canReset",
    coalesce((SELECT json_agg(json_build_object('id', pol.id, 'name', pol.name) ORDER BY pol.name)
              FROM politicians pol WHERE lower(pol.email) = b.address), '[]') AS politicians,
    (SELECT json_build_object('id', l.id, 'to', pol.name)
     FROM email_sends s JOIN letters l ON l.id = s.letter_id JOIN politicians pol ON pol.id = l.politician_id
     WHERE s.message_id = p.message_id) AS letter,
    (SELECT count(*)::int FROM email_sends s WHERE s.address = b.address AND s.outcome = 'refused' AND s.at >= p.at) AS refused
  FROM email_blocks b JOIN email_problems p ON p.id = b.problem_id`;

/**
 * Which addresses a list is of: politicians', or every other, staff's and
 * unknown ones included, which may be supporters'. Each has its own page,
 * so an address that's no longer a politician's moves to the other.
 */
export type EmailScope = "politicians" | "others";

/** Whether `column` is a politician's address, or isn't, for `scope`. */
function inScope(column: string, scope: EmailScope): string {
  return `${scope === "politicians" ? "" : "NOT "}EXISTS (SELECT 1 FROM politicians pol WHERE lower(pol.email) = ${column})`;
}

/** Whether an address is a politician's. */
export async function isPoliticianAddress(address: string): Promise<boolean> {
  const [row] = await query(`SELECT 1 WHERE ${inScope("$1", "politicians")}`, [bareAddress(address)]);
  return !!row;
}

/** Which blocked addresses to list: those blocked by a hard bounce or a complaint, and those with `search` in them. */
export type BlocksFilter = { kind?: "hard" | "complaint"; search?: string };

/** Every blocked address in `scope` that `filter` lets through, newest first. */
export async function listBlocks(scope: EmailScope, filter: BlocksFilter = {}): Promise<EmailBlock[]> {
  return query<EmailBlock>(
    `${SELECT_BLOCKS} WHERE ($1::text IS NULL OR p.kind = $1) AND ($2::text IS NULL OR b.address ILIKE $2)
       AND ${inScope("b.address", scope)} ORDER BY p.at DESC, b.address`,
    [filter.kind ?? null, filter.search ? `%${filter.search}%` : null],
  );
}

/** The block on an address, if it has one, such as a politician's, who may have none. */
export async function blockOn(address: string | null): Promise<EmailBlock | undefined> {
  if (!address) return undefined;
  const [block] = await query<EmailBlock>(`${SELECT_BLOCKS} WHERE b.address = $1`, [bareAddress(address)]);
  return block;
}

/** A letter an email was, for the staff interface: its ID and the name of the politician it was to. */
export type SentLetter = { id: number; to: string };

/** A bounce or complaint, for the staff interface. */
export type ProblemSummary = {
  id: number;
  at: string;
  address: string;
  kind: DeliveryProblem["kind"];
  reason: string;
  /** What the email was, if we sent it. */
  purpose: Purpose | null;
  /** The letter it was, if it was one, and the politician it was to. */
  letter: SentLetter | null;
};

/** The latest bounces and complaints to addresses in `scope`, soft bounces too, newest first. */
export async function recentProblems(scope: EmailScope, limit = 100): Promise<ProblemSummary[]> {
  return query<ProblemSummary>(
    `SELECT p.id::int AS id, p.at, p.address, p.kind, p.reason, s.purpose,
       CASE WHEN pol.id IS NOT NULL THEN json_build_object('id', l.id, 'to', pol.name) END AS letter
     FROM email_problems p LEFT JOIN email_sends s ON s.message_id = p.message_id
       LEFT JOIN letters l ON l.id = s.letter_id LEFT JOIN politicians pol ON pol.id = l.politician_id
     WHERE ${inScope("p.address", scope)}
     ORDER BY p.at DESC, p.id DESC LIMIT $1`,
    [limit],
  );
}
