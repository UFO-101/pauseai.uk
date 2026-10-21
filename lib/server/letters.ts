import "server-only";
import { query } from "./db";

// Letters, for the staff interface.

export type LetterEvent = { at: string; status: string; details: Record<string, unknown> };

export type LetterSummary = {
  id: number;
  campaign: string;
  status: string;
  senderName: string;
  senderEmail: string;
  /** Whether they agreed to hear about events and ways to help. */
  contactConsent: boolean;
  mpName: string;
  isTest: boolean;
  subject: string;
  createdAt: string;
  sentAt: string | null;
  /** When a reply from anyone but the sender first reached us. */
  repliedAt: string | null;
  /** The supporter the sender is, once linked. */
  supporterId: number | null;
  events: LetterEvent[];
};

/**
 * Recent letters, newest first, optionally only those with a status, or
 * "replied" (a person replied) or "auto_reply" (a machine did).
 */
export async function recentLetters({ status, limit = 200 }: { status?: string; limit?: number } = {}): Promise<
  LetterSummary[]
> {
  return query<LetterSummary>(
    `SELECT l.id::int AS id, l.campaign, l.status, l.sender_name AS "senderName", l.sender_email AS "senderEmail",
       l.contact_consent AS "contactConsent", p.name AS "mpName", p.is_test AS "isTest", l.subject, l.created_at AS "createdAt", l.sent_at AS "sentAt", l.replied_at AS "repliedAt",
       (SELECT k.supporter_id::int FROM supporter_links k WHERE k.letter_id = l.id) AS "supporterId",
       coalesce((SELECT json_agg(json_build_object('at', e.at, 'status', e.status, 'details', e.details) ORDER BY e.at, e.id)
                 FROM letter_events e WHERE e.letter_id = l.id), '[]') AS events
     FROM letters l JOIN politicians p ON p.id = l.politician_id
     WHERE $1::text IS NULL OR l.status = $1 OR ($1 = 'replied' AND l.replied_at IS NOT NULL)
       OR ($1 = 'auto_reply' AND EXISTS (SELECT 1 FROM letter_events e WHERE e.letter_id = l.id AND e.status = 'auto_reply'))
     ORDER BY l.created_at DESC, l.id DESC LIMIT $2`,
    [status ?? null, limit],
  );
}
