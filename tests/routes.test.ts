import { describe, expect, it } from "vitest";
import { DYNAMIC_EXAMPLES, ROUTES, discoverDynamicRoutes } from "./routes";

describe("route list", () => {
  it("has an example for every dynamic route", () => {
    expect(discoverDynamicRoutes().sort()).toEqual(Object.keys(DYNAMIC_EXAMPLES).sort());
  });

  it("includes the home page, hidden tools and the dynamic examples", () => {
    expect(ROUTES).toContain("/");
    expect(ROUTES).toContain("/tools/collateral");
    for (const example of Object.values(DYNAMIC_EXAMPLES)) expect(ROUTES).toContain(example);
    expect(ROUTES.every((route) => !route.includes("["))).toBe(true);
  });
});
