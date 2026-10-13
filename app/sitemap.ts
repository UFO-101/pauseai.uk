import { readdirSync } from "fs";
import { join } from "path";
import type { MetadataRoute } from "next";
import { posts } from "@/lib/content/blog";
import { people, personSlug } from "@/lib/content/people";
import { site } from "@/lib/content/site";

// Walks app/ for page.tsx files, skipping api/ (not a page), dynamic
// segments like [slug] (those are added separately below, from the data
// that actually drives generateStaticParams), and private folders like
// _components (excluded from routing by Next). Route groups like
// (marketing) are recursed into but don't contribute a URL segment,
// matching how Next strips them from the real route.
export function discoverStaticRoutes(dir: string, base = ""): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "api" || entry.name.startsWith("[") || entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const isRouteGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
      routes.push(...discoverStaticRoutes(path, isRouteGroup ? base : `${base}/${entry.name}`));
    } else if (entry.name === "page.tsx") {
      routes.push(base);
    }
  }
  return routes;
}

// Real pages that should stay out of the sitemap: unlisted volunteer tools,
// and Email your MP version 2 while it's being built.
export const HIDDEN_ROUTES = ["/email-your-mp-v2", "/email-your-mp-v2/confirm", "/tools", "/tools/collateral", "/tools/qr", "/trackers", "/trackers/2026-09-26-flyering", "/trackers/2026-10-10-flyering"];

/** The staff interface, which nothing links to. */
export function isStaffRoute(path: string): boolean {
  return path === "/staff" || path.startsWith("/staff/");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = discoverStaticRoutes(join(process.cwd(), "app"))
    .filter((path) => !HIDDEN_ROUTES.includes(path) && !isStaffRoute(path))
    .sort();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${site.url}${path}`,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${site.url}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  const peopleEntries: MetadataRoute.Sitemap = people.map((person) => ({
    url: `${site.url}/people/${personSlug(person)}`,
  }));

  return [...staticEntries, ...postEntries, ...peopleEntries];
}
