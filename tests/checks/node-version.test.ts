import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// .nvmrc names the Node major that Netlify builds and runs the site on, and CI
// sets up, each taking its latest release. package.json's "engines" holds that
// major from its lowest safe release, and engine-strict in .npmrc makes npm
// refuse any other. Nothing else names a version, so the places can't drift
// apart.

const read = (path: string) => readFileSync(path, "utf8");
const major = read(".nvmrc").trim();
const packageJson = JSON.parse(read("package.json"));

describe("the Node version", () => {
  it("is a major version alone", () => {
    expect(major).toMatch(/^\d+$/);
  });

  it("is the one npm insists on", () => {
    expect(packageJson.engines.node).toMatch(new RegExp(`^>=${major}\\.\\d+\\.\\d+ <${Number(major) + 1}$`));
    expect(read(".npmrc")).toMatch(/^engine-strict=true$/m);
  });

  it("is the one the Node types describe", () => {
    expect(packageJson.devDependencies["@types/node"]).toMatch(new RegExp(`^\\^${major}\\.`));
  });

  it("is set up from .nvmrc in CI, and named nowhere else", () => {
    expect(read(".github/workflows/ci.yml")).not.toMatch(/node-version:/);
    const setups = read(".github/workflows/ci.yml").match(/uses: actions\/setup-node@.*\n(?: {8}.*\n)*/g) ?? [];
    expect(setups).not.toHaveLength(0);
    for (const setup of setups) {
      expect(setup).toMatch(/node-version-file: \.nvmrc/);
      expect(setup).toMatch(/check-latest: true/);
    }
    expect(read("netlify.toml")).not.toMatch(/NODE_VERSION/);
  });
});
