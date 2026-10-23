import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// .nvmrc names the Node major that Netlify builds and runs the site on, CI
// sets up, and npm insists on (package.json's "engines", with engine-strict in
// .npmrc). Nothing else names a version, so the places can't drift apart.

const read = (path: string) => readFileSync(path, "utf8");
const major = read(".nvmrc").trim();
const packageJson = JSON.parse(read("package.json"));

describe("the Node version", () => {
  it("is a major version alone", () => {
    expect(major).toMatch(/^\d+$/);
  });

  it("is the one npm insists on", () => {
    expect(packageJson.engines.node).toBe(`${major}.x`);
    expect(read(".npmrc")).toMatch(/^engine-strict=true$/m);
  });

  it("is the one the Node types describe", () => {
    expect(packageJson.devDependencies["@types/node"]).toMatch(new RegExp(`^\\^${major}\\.`));
  });

  it("is set up from .nvmrc in CI, and named nowhere else", () => {
    expect(read(".github/workflows/ci.yml")).not.toMatch(/node-version:/);
    expect(read(".github/workflows/ci.yml")).toMatch(/node-version-file: \.nvmrc/);
    expect(read("netlify.toml")).not.toMatch(/NODE_VERSION/);
  });
});
