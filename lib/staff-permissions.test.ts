import { describe, expect, it } from "vitest";
import { BUILT_IN_ADMIN, effectivePermissions, isPermission } from "./staff-permissions";

describe("permissions", () => {
  it("knows the two permissions", () => {
    expect(isPermission("admin")).toBe(true);
    expect(isPermission("supporters")).toBe(true);
    expect(isPermission("root")).toBe(false);
  });

  it("gives the built-in admin everything, however spelt, and everyone else what they were granted", () => {
    expect(effectivePermissions(BUILT_IN_ADMIN, [])).toEqual(["admin", "supporters"]);
    expect(effectivePermissions("Admin@PauseAI.uk", ["supporters"])).toEqual(["admin", "supporters"]);
    expect(effectivePermissions("jo@pauseai.uk", ["supporters"])).toEqual(["supporters"]);
    expect(effectivePermissions("jo@pauseai.uk", [])).toEqual([]);
  });
});
