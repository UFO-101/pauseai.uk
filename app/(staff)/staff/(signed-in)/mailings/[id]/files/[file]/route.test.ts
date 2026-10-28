import { beforeEach, expect, it, vi } from "vitest";
import { addAttachment, createDraft } from "@/lib/server/mailing-drafts";
import { createSession } from "@/lib/server/staff-auth";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/tests/next-headers"));

const open = (id: string, file: string) =>
  GET(new Request(`https://pauseai.uk/staff/mailings/${id}/files/${file}`), { params: Promise.resolve({ id, file }) });

describeWithDatabase("GET /staff/mailings/[id]/files/[file]", () => {
  useTestDatabase();
  beforeEach(() => requestCookies.clear());

  it("gives one of a mailing's files, to open in the browser, by its name", async () => {
    requestCookies.set("staff_session", await createSession("jo@pauseai.uk"));
    const { id } = await createDraft("jo@pauseai.uk", { list: "politicians", params: {} }, {});
    const content = Buffer.from("%PDF-1.4");
    await addAttachment(id, 1, { filename: "Brief: Ünïcode.pdf", contentType: "application/pdf", content });
    const res = await open(String(id), "1");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe("inline; filename*=UTF-8''Brief%3A%20%C3%9Cn%C3%AFcode.pdf");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(content);
    // None of another mailing's, none that isn't there, and no ID that isn't one.
    expect((await open(String(id + 1), "1")).status).toBe(404);
    expect((await open(String(id), "2")).status).toBe(404);
    expect((await open("x", "1")).status).toBe(404);
    expect((await open(String(id), "x")).status).toBe(404);
  });

  it("turns away anyone not logged in", async () => {
    expect(await expectRedirect(() => open("1", "1"))).toMatch(/^\/staff\/login/);
  });
});
