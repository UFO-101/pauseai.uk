// The replies to PauseAI's letters, each kept whole by the site in Netlify
// Blobs, outside the database, so the dump doesn't hold them. After each
// backup, the Worker copies the new ones into the bucket, through the
// site's read-only routes (app/api/backup/letter-replies), and keeps the
// last it copied, so each is copied once.
//
//   replies/<key>          the message, gzipped, under the site's key
//   replies/latest.json    { "after": <the last row copied> }

export const REPLIES_LATEST = "replies/latest.json";

export interface ReplyDeps {
  bucket: {
    get(key: string): Promise<{ text(): Promise<string> } | null>;
    put(key: string, value: string | ArrayBuffer): Promise<unknown>;
  };
  /** Asks the site, with a path, as fetch does, with the backup's secret. */
  site(path: string): Promise<Response>;
}

/** Copies every reply kept since the last copied. Says how many, and what went wrong. */
export async function copyReplies({ bucket, site }: ReplyDeps): Promise<{ copied: number; problems: string[] }> {
  let copied = 0;
  try {
    const latest = await bucket.get(REPLIES_LATEST);
    let after = latest ? (JSON.parse(await latest.text()) as { after: number }).after : 0;
    for (;;) {
      const page = await site(`/api/backup/letter-replies?after=${after}`);
      if (!page.ok) throw new Error(`The site wouldn't list the replies: ${page.status}.`);
      const { replies } = (await page.json()) as { replies: { id: number; key: string }[] };
      if (!replies.length) break;
      for (const reply of replies) {
        const file = await site(`/api/backup/letter-replies/${reply.id}`);
        if (!file.ok) throw new Error(`The site wouldn't send reply ${reply.id}: ${file.status}.`);
        await bucket.put(`replies/${reply.key}`, await file.arrayBuffer());
        after = reply.id;
        copied++;
      }
      await bucket.put(REPLIES_LATEST, JSON.stringify({ after }));
    }
    return { copied, problems: [] };
  } catch (error) {
    return { copied, problems: [(error as Error).message] };
  }
}
