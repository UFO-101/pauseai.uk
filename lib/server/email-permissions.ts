import "server-only";
import { type EmailFacts, type EmailPermission, emailPermissions } from "@/lib/email-permissions";
import { query } from "./db";

// What we may email each address about (lib/email-permissions.ts), from
// what every source holds about it: a block, opt-outs in force, following
// the Luma calendar, the newest member record we still hold, and the
// newest letter. Every time comes as JSON's text, so the facts are plain
// data whichever column they came from.

/** Every topic's answer for each of `addresses`, in their order, a topic at a time. */
export async function permissionsFor(addresses: string[]): Promise<EmailPermission[]> {
  const facts = await query<EmailFacts>(
    `SELECT a.address,
       (SELECT json_build_object('at', p.at, 'kind', p.kind) FROM email_blocks b JOIN email_problems p ON p.id = b.problem_id
        WHERE b.address = a.address) AS blocked,
       coalesce((SELECT json_agg(json_build_object('list', o.list, 'source', o.source, 'at', o.unsubscribed_at))
        FROM opt_outs o WHERE o.address = a.address AND o.resubscribed_at IS NULL), '[]') AS "optOuts",
       (SELECT to_json(min(l.contact_since)) FROM luma_people l WHERE l.email = a.address) AS "followingSince",
       (SELECT json_build_object('createdAt', m.created_at, 'keepInformed', m.keep_informed) FROM members m
        WHERE m.email = a.address AND m.removed_at IS NULL ORDER BY m.created_at DESC, m.id LIMIT 1) AS member,
       (SELECT json_build_object('at', t.created_at, 'consent', t.contact_consent) FROM letters t
        WHERE lower(trim(t.sender_email)) = a.address ORDER BY t.created_at DESC, t.id DESC LIMIT 1) AS letter
     FROM unnest($1::text[]) WITH ORDINALITY AS a(address, n) ORDER BY a.n`,
    [addresses.map((address) => address.trim().toLowerCase())],
  );
  return facts.flatMap(emailPermissions);
}
