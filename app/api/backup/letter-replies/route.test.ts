import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { query } from "@/lib/server/db";
import { saveLetterReply } from "@/lib/server/outside-services/blobs";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { GET as file } from "./[id]/route";
import { GET as list } from "./route";

beforeEach(() => {
  vi.stubEnv("BACKUP_SECRET", "b4ckup");
  vi.stubEnv("DATA_FIXTURES", "1");
});
afterEach(() => vi.unstubAllEnvs());

const ask = (path: string, authorization = "Bearer b4ckup") =>
  new NextRequest(`https://pauseai.uk/api/backup/letter-replies${path}`, { headers: { authorization } });

describeWithDatabase("GET /api/backup/letter-replies", () => {
  useTestDatabase();

  it("lists the kept replies after an ID, and sends each, gzipped, to the backup", async () => {
    const politician = await addTestPolitician();
    const [{ id: letter }] = await query<{ id: number }>(
      "INSERT INTO letters (kind, notable_person_id, status) VALUES ('pauseai', $1, 'sent') RETURNING id::int AS id",
      [politician],
    );
    await saveLetterReply("jo/m1.eml.gz", gzipSync("hello"));
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO letter_replies (letter_id, account, gmail_message_id, gmail_thread_id, from_address, at, from_us, blob_key, size)
       VALUES ($1, 'jo@pauseai.uk', 'm1', 't1', 'p@example.org', now(), false, 'jo/m1.eml.gz', 5) RETURNING id::int AS id`,
      [letter],
    );
    expect(await (await list(ask(""))).json()).toEqual({ replies: [{ id, key: "jo/m1.eml.gz" }] });
    expect(await (await list(ask(`?after=${id}`))).json()).toEqual({ replies: [] });
    const res = await file(ask(`/${id}`), { params: Promise.resolve({ id: String(id) }) });
    expect(res.headers.get("content-type")).toBe("application/gzip");
    expect(Buffer.from(await res.arrayBuffer()).equals(gzipSync("hello"))).toBe(true);
    expect((await file(ask("/x"), { params: Promise.resolve({ id: "x" }) })).status).toBe(404);
  });

  it("refuses anyone without the backup's secret", async () => {
    expect((await list(ask("", "Bearer guess"))).status).toBe(401);
    expect((await file(ask("/1", "Bearer guess"), { params: Promise.resolve({ id: "1" }) })).status).toBe(401);
  });
});
