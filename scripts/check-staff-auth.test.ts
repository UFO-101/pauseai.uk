import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = join(process.cwd(), "scripts/check-staff-auth.mjs");
let dir: string;

function tree(files: Record<string, string>) {
  dir = mkdtempSync(join(tmpdir(), "staff-auth-"));
  for (const [path, source] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, "app/(staff)", path)), { recursive: true });
    writeFileSync(join(dir, "app/(staff)", path), source);
  }
}

function check(): { ok: boolean; output: string } {
  try {
    return { ok: true, output: execFileSync("node", [SCRIPT], { cwd: dir, encoding: "utf8", stdio: "pipe" }) };
  } catch (error) {
    return { ok: false, output: String((error as { stderr: string }).stderr) };
  }
}

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("check-staff-auth", () => {
  it("passes when every page, route and Server Action calls requireStaff()", () => {
    tree({
      "staff/page.tsx": "await requireStaff();",
      "staff/api/thing/route.ts": "await requireStaff();",
      "staff/actions.ts": '"use server";\nawait requireStaff();',
      "staff/login/page.tsx": "open",
      "staff/api/login/route.ts": "open",
      "staff/api/callback/route.ts": "open",
      "staff/_components/Table.tsx": "a component",
      "staff/page.test.tsx": "a test",
      "layout.tsx": "a layout",
    });
    expect(check()).toMatchObject({ ok: true, output: expect.stringContaining("(6 files)") });
  });

  it("fails on a page, route or Server Action that doesn't", () => {
    tree({
      "staff/x/page.tsx": "requireStaff",
      "staff/api/y/route.ts": "",
      "staff/more.ts": "'use server'\nexport async function f() {}",
    });
    const { ok, output } = check();
    expect(ok).toBe(false);
    for (const file of ["x/page.tsx", "y/route.ts", "more.ts"]) expect(output).toContain(file);
  });

  it("passes on the real staff interface", () => {
    expect(execFileSync("node", [SCRIPT], { encoding: "utf8" })).toContain("OK");
  });
});
