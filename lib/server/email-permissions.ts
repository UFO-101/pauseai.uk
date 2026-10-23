import "server-only";
import { EMAIL_TOPICS, type EmailPermission } from "@/lib/email-permissions";
import { query } from "./db";

// What we may email each address about, from the email_permissions view,
// which holds the rules (lib/email-permissions.ts). Each time comes as
// JSON's text, so an answer is plain data.

/** Every topic's answer for each of `addresses`, in their order, a topic at a time. */
export async function permissionsFor(addresses: string[]): Promise<EmailPermission[]> {
  return query<EmailPermission>(
    `SELECT p.topic, p.address, p.send, p.reason, to_json(p.at) #>> '{}' AS at, p.source
     FROM email_permissions p WHERE p.address = ANY($1::text[])
     ORDER BY array_position($1::text[], p.address), array_position($2::text[], p.topic)`,
    [addresses.map((address) => address.trim().toLowerCase()), EMAIL_TOPICS],
  );
}
