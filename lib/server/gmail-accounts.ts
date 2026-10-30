import "server-only";
import { GMAIL_DAILY_LIMIT } from "@/lib/gmail-connect";
import { logChange } from "./audit";
import { query } from "./db";
import { decryptToken, encryptToken } from "./gmail-tokens";
import {
  exchangeGmailCode,
  gmailAccessToken,
  gmailProfile,
  gmailSendName,
  GmailError,
  revokeGmail,
} from "./outside-services/gmail";

// Staff members' Gmail, connected so mailings to politicians can be sent
// from it and replies read from it. Each staff member connects their own,
// from their page or from a mailing's Sent from; once it's connected, any
// staff member can send a mailing from it. The refresh token is kept
// encrypted on their account (staff_accounts), and deleted when they
// disconnect or their account is removed.

export { GMAIL_DAILY_LIMIT };

/**
 * A connected Gmail: its address; the name it sends as, empty when it has
 * none of its own; and how many it has sent in the last day and how many
 * more it can.
 */
export type GmailAccount = { email: string; name: string; connectedAt: string; sentToday: number; remaining: number };

/** Why connecting didn't: the person consented as another Google account than their own. */
export type ConnectResult = { connected: true } | { connected: false; reason: "other-account" };

const SENT_TODAY = `(SELECT count(*)::int FROM email_sends s
  WHERE s.sender = a.email AND s.outcome = 'sent' AND s.at > now() - interval '1 day')`;

/** Every connected account, by address. */
export async function gmailAccounts(): Promise<GmailAccount[]> {
  const rows = await query<{ email: string; name: string; connectedAt: string; sentToday: number }>(
    `SELECT a.email, coalesce(a.gmail_name, '') AS name, a.gmail_connected_at AS "connectedAt", ${SENT_TODAY} AS "sentToday"
     FROM staff_accounts a WHERE a.gmail_token IS NOT NULL ORDER BY a.email`,
  );
  return rows.map((row) => ({ ...row, remaining: Math.max(0, GMAIL_DAILY_LIMIT - row.sentToday) }));
}

/** One account's Gmail, if it's connected. */
export async function gmailAccount(email: string): Promise<GmailAccount | undefined> {
  return (await gmailAccounts()).find((account) => account.email === email.toLowerCase());
}

/** Keeps the name `email`'s connected Gmail now sends as, as reading it finds it. */
export async function saveGmailName(email: string, name: string): Promise<void> {
  await query("UPDATE staff_accounts SET gmail_name = $2 WHERE email = $1 AND gmail_token IS NOT NULL", [
    email.toLowerCase(),
    name,
  ]);
}

/** How many `email` has sent in the last day, connected or not. */
export async function sentToday(email: string): Promise<number> {
  const [row] = await query<{ sent: number }>(`SELECT ${SENT_TODAY} AS sent FROM (SELECT $1::text AS email) a`, [
    email.toLowerCase(),
  ]);
  return row.sent;
}

/**
 * Connects `account`'s Gmail with the code Google's consent came back with,
 * if the mailbox consented to is the account's own, and starts reading it
 * from now. Logs it.
 */
export async function connectGmail(account: string, code: string, redirectUri: string): Promise<ConnectResult> {
  const refreshToken = await exchangeGmailCode(code, redirectUri);
  const { token } = await gmailAccessToken(refreshToken);
  const profile = await gmailProfile(token);
  if (profile.emailAddress.toLowerCase() !== account.toLowerCase()) {
    await revokeGmail(refreshToken);
    return { connected: false, reason: "other-account" };
  }
  await query(
    `UPDATE staff_accounts SET gmail_token = $2, gmail_connected_at = now(), gmail_history_id = $3, gmail_name = $4
     WHERE email = $1`,
    [account.toLowerCase(), encryptToken(refreshToken), profile.historyId, await gmailSendName(token)],
  );
  await logChange(account, "connect gmail", { email: account.toLowerCase() });
  return { connected: true };
}

/** Forgets `account`'s token, as `by`, and logs it. Says whether it was connected. */
async function forget(account: string, by: string, why: string): Promise<string | undefined> {
  const [row] = await query<{ token: Buffer }>(
    `WITH old AS (SELECT email, gmail_token FROM staff_accounts WHERE email = $1 AND gmail_token IS NOT NULL FOR UPDATE)
     UPDATE staff_accounts a SET gmail_token = NULL, gmail_connected_at = NULL, gmail_history_id = NULL, gmail_name = NULL
     FROM old WHERE a.email = old.email RETURNING old.gmail_token AS token`,
    [account.toLowerCase()],
  );
  if (!row) return undefined;
  await logChange(by, "disconnect gmail", { email: account.toLowerCase(), why });
  return decryptToken(row.token);
}

/** Disconnects `account`'s Gmail, as `by`: tells Google, then deletes the token. Says whether it was connected. */
export async function disconnectGmail(account: string, by: string): Promise<boolean> {
  const token = await forget(account, by, "disconnected");
  if (token === undefined) return false;
  await revokeGmail(token).catch((error) => console.error(`Couldn't revoke ${account}'s Gmail token:`, error));
  return true;
}

/**
 * Access tokens, until a minute before they expire, by the stored refresh
 * token they came from, so connecting again starts afresh.
 */
const accessTokens = new Map<string, { token: string; until: number }>();

/**
 * An access token for a connected account. If Google no longer accepts its
 * refresh token, as when the person removed the site's access, the account
 * is disconnected, and logged so. Throws a GmailError for an account that
 * isn't connected, or that Google refused.
 */
export async function gmailAccess(account: string): Promise<string> {
  const email = account.toLowerCase();
  const [row] = await query<{ token: Buffer | null }>(
    "SELECT gmail_token AS token FROM staff_accounts WHERE email = $1",
    [email],
  );
  if (!row?.token) throw new GmailError(`${email}'s Gmail isn't connected`, 0);
  const key = row.token.toString("base64");
  const cached = accessTokens.get(key);
  if (cached && cached.until > Date.now()) return cached.token;
  try {
    const { token, expiresIn } = await gmailAccessToken(decryptToken(row.token));
    accessTokens.set(key, { token, until: Date.now() + (expiresIn - 60) * 1000 });
    return token;
  } catch (error) {
    if (error instanceof GmailError && error.revoked) await forget(email, "google", "access revoked");
    throw error;
  }
}

/** The connected accounts and where reading each last got to. */
export async function gmailReadingState(): Promise<{ email: string; historyId: string }[]> {
  return query<{ email: string; historyId: string }>(
    `SELECT email, gmail_history_id AS "historyId" FROM staff_accounts WHERE gmail_token IS NOT NULL ORDER BY email`,
  );
}

/** Where reading an account got to. */
export async function saveHistoryId(account: string, historyId: string): Promise<void> {
  await query("UPDATE staff_accounts SET gmail_history_id = $2 WHERE email = $1 AND gmail_token IS NOT NULL", [
    account,
    historyId,
  ]);
}
