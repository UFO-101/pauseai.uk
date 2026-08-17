import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { discoverStaticRoutes } from "./sitemap";
import sitemap from "./sitemap";
import { people, personSlug } from "@/lib/data/people";
import { posts } from "@/lib/data/blog";
import { site } from "@/lib/data/site";

let dir: string | undefined;

function makePage(...segments: string[]) {
  const pageDir = join(dir!, ...segments);
  mkdirSync(pageDir, { recursive: true });
  writeFileSync(join(pageDir, "page.tsx"), "export default function Page() { return null; }");
}

function makeFile(...segments: string[]) {
  const filePath = join(dir!, ...segments);
  mkdirSync(join(dir!, ...segments.slice(0, -1)), { recursive: true });
  writeFileSync(filePath, "");
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("discoverStaticRoutes", () => {
  it("finds the root page as an empty path", () => {
    dir = mkdtempSync(join(tmpdir(), "sitemap-test-"));
    makePage();

    expect(discoverStaticRoutes(dir)).toEqual([""]);
  });

  it("finds nested pages by directory path", () => {
    dir = mkdtempSync(join(tmpdir(), "sitemap-test-"));
    makePage("about");
    makePage("contact", "team");

    expect(discoverStaticRoutes(dir).sort()).toEqual(["/about", "/contact/team"]);
  });

  it("skips the api/ directory", () => {
    dir = mkdtempSync(join(tmpdir(), "sitemap-test-"));
    makePage("api", "webhook");
    makePage("about");

    expect(discoverStaticRoutes(dir)).toEqual(["/about"]);
  });

  it("skips dynamic segments like [slug]", () => {
    dir = mkdtempSync(join(tmpdir(), "sitemap-test-"));
    makePage("blog", "[slug]");
    makePage("blog");

    expect(discoverStaticRoutes(dir)).toEqual(["/blog"]);
  });

  it("skips dotfile directories", () => {
    dir = mkdtempSync(join(tmpdir(), "sitemap-test-"));
    makePage(".well-known", "hidden");
    makePage("about");

    expect(discoverStaticRoutes(dir)).toEqual(["/about"]);
  });

  it("skips private folders prefixed with an underscore", () => {
    dir = mkdtempSync(join(tmpdir(), "sitemap-test-"));
    makePage("_components", "hidden");
    makePage("about");

    expect(discoverStaticRoutes(dir)).toEqual(["/about"]);
  });

  it("recurses into route groups without adding them to the URL", () => {
    dir = mkdtempSync(join(tmpdir(), "sitemap-test-"));
    makePage("(marketing)", "about");
    makePage("(marketing)", "pricing");

    expect(discoverStaticRoutes(dir).sort()).toEqual(["/about", "/pricing"]);
  });

  it("ignores non-page.tsx files", () => {
    dir = mkdtempSync(join(tmpdir(), "sitemap-test-"));
    makeFile("about", "layout.tsx");

    expect(discoverStaticRoutes(dir)).toEqual([]);
  });
});

describe("sitemap", () => {
  it("returns unique URLs that all start with the site origin", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url.startsWith(site.url)).toBe(true);
    }
  });

  it("includes every person from lib/data/people at their computed slug", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    for (const person of people) {
      expect(urls).toContain(`${site.url}/people/${personSlug(person)}`);
    }
  });

  it("includes every blog post at its slug", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    for (const post of posts) {
      expect(urls).toContain(`${site.url}/blog/${post.slug}`);
    }
  });

  it("does not include any api routes", () => {
    const entries = sitemap();

    for (const entry of entries) {
      expect(entry.url).not.toMatch(/\/api(\/|$)/);
    }
  });
});
