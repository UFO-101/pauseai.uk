import { describe, expect, it, vi } from "vitest";
import { copyReplies, REPLIES_LATEST } from "./replies.ts";

function fakeBucket(objects: Record<string, string | ArrayBuffer> = {}) {
  return {
    objects,
    get: vi.fn(async (key: string) => (key in objects ? { text: async () => String(objects[key]) } : null)),
    put: vi.fn(async (key: string, value: string | ArrayBuffer) => {
      objects[key] = value;
    }),
  };
}

/** A site with the replies `kept`, listing two at a time after the ID asked for. */
function fakeSite(kept: { id: number; key: string }[], fail: { list?: number; file?: number } = {}) {
  return vi.fn(async (path: string) => {
    const after = /after=(\d+)/.exec(path);
    if (after) {
      if (fail.list) return new Response("no", { status: fail.list });
      return Response.json({ replies: kept.filter((reply) => reply.id > Number(after[1])).slice(0, 2) });
    }
    if (fail.file) return new Response("no", { status: fail.file });
    return new Response(`message ${path.split("/").pop()}`);
  });
}

const text = (value: string | ArrayBuffer) => new TextDecoder().decode(value as ArrayBuffer);

describe("copyReplies", () => {
  it("copies every reply kept since the last, page by page, and keeps where it got to", async () => {
    const bucket = fakeBucket({ [REPLIES_LATEST]: JSON.stringify({ after: 1 }) });
    const kept = [1, 2, 3, 5].map((id) => ({ id, key: `jo@pauseai.uk/m${id}.eml.gz` }));
    const site = fakeSite(kept);
    expect(await copyReplies({ bucket, site })).toEqual({ copied: 3, problems: [] });
    expect(site.mock.calls.map(([path]) => path)).toEqual([
      "/api/backup/letter-replies?after=1",
      "/api/backup/letter-replies/2",
      "/api/backup/letter-replies/3",
      "/api/backup/letter-replies?after=3",
      "/api/backup/letter-replies/5",
      "/api/backup/letter-replies?after=5",
    ]);
    expect(text(bucket.objects["replies/jo@pauseai.uk/m5.eml.gz"])).toBe("message 5");
    expect(bucket.objects["replies/jo@pauseai.uk/m1.eml.gz"]).toBeUndefined();
    expect(JSON.parse(String(bucket.objects[REPLIES_LATEST]))).toEqual({ after: 5 });
  });

  it("starts from the first, the first time, and copies nothing when there's nothing new", async () => {
    const bucket = fakeBucket();
    expect(await copyReplies({ bucket, site: fakeSite([]) })).toEqual({ copied: 0, problems: [] });
    expect(bucket.objects).toEqual({});
  });

  it("says what went wrong, keeping what it copied before", async () => {
    expect(await copyReplies({ bucket: fakeBucket(), site: fakeSite([], { list: 401 }) })).toEqual({
      copied: 0,
      problems: ["The site wouldn't list the replies: 401."],
    });
    const bucket = fakeBucket();
    expect(await copyReplies({ bucket, site: fakeSite([{ id: 4, key: "k" }], { file: 404 }) })).toEqual({
      copied: 0,
      problems: ["The site wouldn't send reply 4: 404."],
    });
    expect(bucket.objects).toEqual({});
  });
});
