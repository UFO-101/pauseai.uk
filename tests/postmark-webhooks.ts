// Builds requests to the Postmark webhook routes, for their tests.
const WEBHOOK_AUTH = `Basic ${Buffer.from("postmark:hunter2").toString("base64")}`;

/** `authorization` null sends none. */
export function webhookRequest(path: string, payload: unknown, authorization: string | null = WEBHOOK_AUTH): Request {
  return new Request(`https://pauseai.uk${path}`, {
    method: "POST",
    headers: authorization
      ? { authorization, "content-type": "application/json" }
      : { "content-type": "application/json" },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}
