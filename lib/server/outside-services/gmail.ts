import "server-only";
import { saveToOutbox } from "@/tests/fixtures/outbox";
import { toMime, type MimeEmail } from "../mime";
import { outsideFetch } from "./outside-fetch";

// The only file that talks to Google: the OAuth consent that connects a
// staff member's Gmail, and the Gmail API, over HTTP through outsideFetch,
// not Google's SDK, which makes its own requests. The consent screen is the
// Google Cloud project's, Internal, so only pauseai.uk accounts can grant
// it. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are its OAuth client's.
//
// With DATA_FIXTURES=1, consent comes straight back to the site, and every
// call is answered by tests/fixtures/outside-services.ts, which knows the
// account from its token.

const CONSENT_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";

/** What the site asks for: to send as the account, and to read it (it reads only replies to our letters, and bounces). */
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  // The account's name, for when its address sends as none of its own.
  "https://www.googleapis.com/auth/userinfo.profile",
];

export class GmailError extends Error {
  /** Google no longer accepts the refresh token: it was revoked, or the account's access removed. */
  readonly revoked: boolean;
  constructor(
    message: string,
    readonly status: number,
    revoked = false,
  ) {
    super(message);
    this.revoked = revoked;
  }
}

function client(): { id: string; secret: string } {
  const fixtures = process.env.DATA_FIXTURES === "1";
  const id = process.env.GOOGLE_CLIENT_ID || (fixtures ? "fixture" : "");
  const secret = process.env.GOOGLE_CLIENT_SECRET || (fixtures ? "fixture" : "");
  if (!id || !secret) throw new GmailError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET aren't set", 0);
  return { id, secret };
}

/**
 * Where to send a staff member to let the site use their Gmail: Google's
 * consent screen, for `account`, which comes back to `redirectUri` with a
 * code and `state`. With fixtures, straight back, with a code naming the
 * account.
 */
export function gmailConsentUrl(account: string, redirectUri: string, state: string): string {
  if (process.env.DATA_FIXTURES === "1") {
    return `${redirectUri}?${new URLSearchParams({ code: `fixture:${account}`, state })}`;
  }
  return `${CONSENT_URL}?${new URLSearchParams({
    client_id: client().id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    // A refresh token, every time, so connecting again replaces a lost one.
    access_type: "offline",
    prompt: "consent",
    login_hint: account,
    state,
  })}`;
}

async function tokenRequest(params: Record<string, string>): Promise<Record<string, unknown>> {
  const { id, secret } = client();
  const res = await outsideFetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, client_id: id, client_secret: secret }).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new GmailError(
      `Google refused the token request: ${res.status} ${data.error ?? ""}`.trim(),
      res.status,
      data.error === "invalid_grant",
    );
  }
  return data;
}

/** Trades the code consent came back with for a refresh token. */
export async function exchangeGmailCode(code: string, redirectUri: string): Promise<string> {
  const data = await tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  if (typeof data.refresh_token !== "string") throw new GmailError("Google gave no refresh token", 200);
  return data.refresh_token;
}

/** An access token, good for an hour, from a refresh token, and how many seconds it lasts. */
export async function gmailAccessToken(refreshToken: string): Promise<{ token: string; expiresIn: number }> {
  const data = await tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
  return { token: String(data.access_token), expiresIn: Number(data.expires_in) || 3600 };
}

/** Tells Google the site no longer wants the token. A token Google had already dropped is no matter. */
export async function revokeGmail(refreshToken: string): Promise<void> {
  const res = await outsideFetch(`${REVOKE_URL}?${new URLSearchParams({ token: refreshToken })}`, { method: "POST" });
  if (!res.ok && res.status !== 400)
    throw new GmailError(`Google refused to revoke the token: ${res.status}`, res.status);
}

async function api<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await outsideFetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new GmailError(`Gmail answered ${res.status} for ${path.split("?")[0]}`, res.status);
  return (await res.json()) as T;
}

/** The account's address, and its mailbox's history ID now. */
export async function gmailProfile(accessToken: string): Promise<{ emailAddress: string; historyId: string }> {
  return api(accessToken, "/profile");
}

/**
 * The name the account's mail goes out under: its primary "Send mail as"
 * address's, or with none of its own, the Google account's, which Gmail
 * uses then. Empty if neither is known, as for a token given before the
 * site asked to see the account's name.
 */
export async function gmailSendName(accessToken: string): Promise<string> {
  const { sendAs } = await api<{ sendAs: { isPrimary?: boolean; displayName?: string }[] }>(
    accessToken,
    "/settings/sendAs",
  );
  const own = sendAs.find((address) => address.isPrimary)?.displayName;
  if (own) return own;
  const res = await outsideFetch(USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  return res.ok ? (((await res.json()) as { name?: string }).name ?? "") : "";
}

/**
 * Sends an email as the account: Gmail sends it from the account's own
 * address, and keeps it in Sent. Returns Gmail's ID for it and its thread.
 * With fixtures, it's written to the outbox too (tests/fixtures/outbox.ts).
 */
export async function sendGmail(accessToken: string, email: MimeEmail): Promise<{ id: string; threadId: string }> {
  const outbox = process.env.OUTBOX_DIR;
  if (process.env.DATA_FIXTURES === "1" && outbox) saveToOutbox(outbox, { ...email, Tag: "gmail" });
  return api(accessToken, "/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(toMime(email), "utf8").toString("base64url") }),
  });
}

type HistoryPage = {
  history?: { messagesAdded?: { message: { id: string } }[] }[];
  nextPageToken?: string;
  historyId: string;
};

/**
 * The messages added to the mailbox since `startHistoryId`, and its history
 * ID now; undefined when Gmail no longer has history that old (404), so the
 * caller starts again from now.
 */
export async function gmailHistory(
  accessToken: string,
  startHistoryId: string,
): Promise<{ messageIds: string[]; historyId: string } | undefined> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let historyId = startHistoryId;
  do {
    const params = new URLSearchParams({ startHistoryId, historyTypes: "messageAdded" });
    if (pageToken) params.set("pageToken", pageToken);
    let page: HistoryPage;
    try {
      page = await api<HistoryPage>(accessToken, `/history?${params}`);
    } catch (error) {
      if (error instanceof GmailError && error.status === 404) return undefined;
      throw error;
    }
    for (const record of page.history ?? []) ids.push(...(record.messagesAdded ?? []).map((added) => added.message.id));
    pageToken = page.nextPageToken;
    historyId = page.historyId;
  } while (pageToken);
  return { messageIds: [...new Set(ids)], historyId };
}

/** A message's IDs, labels and when it arrived, and the headers asked for, by lowercased name. */
export type GmailMessageHeaders = {
  id: string;
  threadId: string;
  labelIds: string[];
  internalDate: string;
  headers: Map<string, string>;
};

/** Only the `names` headers of a message, and its IDs and labels, without its content. */
export async function gmailMessageHeaders(
  accessToken: string,
  id: string,
  names: string[],
): Promise<GmailMessageHeaders> {
  const params = new URLSearchParams({ format: "metadata" });
  for (const name of names) params.append("metadataHeaders", name);
  const message = await api<{
    id: string;
    threadId: string;
    labelIds?: string[];
    internalDate: string;
    payload?: { headers?: { name: string; value: string }[] };
  }>(accessToken, `/messages/${id}?${params}`);
  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds ?? [],
    internalDate: message.internalDate,
    headers: new Map((message.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value])),
  };
}

/** A whole message, as it arrived. */
export async function gmailRawMessage(accessToken: string, id: string): Promise<Buffer> {
  const message = await api<{ raw: string }>(accessToken, `/messages/${id}?format=raw`);
  return Buffer.from(message.raw, "base64url");
}

/** The IDs of the messages a Gmail search finds, as many as `max`. */
export async function searchGmail(accessToken: string, q: string, max = 100): Promise<string[]> {
  const page = await api<{ messages?: { id: string }[] }>(
    accessToken,
    `/messages?${new URLSearchParams({ q, maxResults: String(max) })}`,
  );
  return (page.messages ?? []).map((message) => message.id);
}
