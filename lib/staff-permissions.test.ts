import { describe, expect, it } from "vitest";
import { isPermission } from "./staff-permissions";

describe("permissions", () => {
  it("knows the two permissions", () => {
    expect(isPermission("admin")).toBe(true);
    expect(isPermission("supporters")).toBe(true);
    expect(isPermission("root")).toBe(false);
  });
});
