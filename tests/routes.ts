// Every page on the site, for the storyboard (tests/storyboard/): the public
// pages section loads each one; the staff section logs in first.
//
// Static routes come from the filesystem (the same walk app/sitemap.ts does),
// including the unlisted tools and trackers. Dynamic routes are represented by
// one example each: same template, so one instance catches template bugs.
// tests/routes.test.ts fails if a dynamic route has no example here.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { discoverStaticRoutes } from "../app/sitemap";
import { posts } from "@/lib/content/blog";
import { people, personSlug } from "@/lib/content/people";

const APP_DIR = join(__dirname, "..", "app");

export const DYNAMIC_EXAMPLES: Record<string, string> = {
  "/blog/[slug]": `/blog/${posts[0].slug}`,
  "/people/[slug]": `/people/${personSlug(people[0])}`,
  // Without a session this redirects to the login page, which is what the
  // smoke test sees.
  "/staff/politicians/[id]": "/staff/politicians/1",
  "/staff/supporters/[id]": "/staff/supporters/1",
  // A group of the component gallery (fixture builds only).
  "/gallery/[group]": "/gallery/ui",
};

/** Route patterns with a dynamic segment, e.g. "/blog/[slug]". */
export function discoverDynamicRoutes(dir = APP_DIR, base = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory() || entry.name === "api" || entry.name.startsWith("_")) return [];
    const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
    const path = isGroup ? base : `${base}/${entry.name}`;
    const here = entry.name.startsWith("[") && readdirSync(join(dir, entry.name)).includes("page.tsx") ? [path] : [];
    return [...here, ...discoverDynamicRoutes(join(dir, entry.name), path)];
  });
}

export const ROUTES: string[] = [
  ...discoverStaticRoutes(APP_DIR).map((route) => route || "/"),
  ...Object.values(DYNAMIC_EXAMPLES),
].sort();
