import { readdirSync } from "fs";
import { join } from "path";
import type { MetadataRoute } from "next";
import { posts } from "@/lib/data/blog";
import { people, personSlug } from "@/lib/data/people";
import { site } from "@/lib/data/site";

// Walks app/ for page.tsx files, skipping api/ (not a page) and dynamic
// segments like [slug] (those are added separately below, from the data
// that actually drives generateStaticParams).
function discoverStaticRoutes(dir: string, base = ""): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "api" || entry.name.startsWith("[") || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...discoverStaticRoutes(path, `${base}/${entry.name}`));
    } else if (entry.name === "page.tsx") {
      routes.push(base);
    }
  }
  return routes;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = discoverStaticRoutes(join(process.cwd(), "app")).sort();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${site.url}${path}`,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${site.url}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  const peopleEntries: MetadataRoute.Sitemap = people.map((person, i) => ({
    url: `${site.url}/people/${personSlug(person, i)}`,
  }));

  return [...staticEntries, ...postEntries, ...peopleEntries];
}
