import { readdirSync } from "fs";
import { join } from "path";
import type { MetadataRoute } from "next";
import { posts } from "@/lib/data/blog";
import { people, personSlug } from "@/lib/data/people";
import { site } from "@/lib/data/site";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = discoverStaticRoutes(join(process.cwd(), "app")).sort();

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
