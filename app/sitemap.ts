import type { MetadataRoute } from "next";
import { posts } from "@/lib/data/blog";
import { people, personSlug } from "@/lib/data/people";
import { site } from "@/lib/data/site";

const staticRoutes = [
  "",
  "/campaigns",
  "/donate",
  "/future-of-workforce-inquiry",
  "/glasgow",
  "/global-ai-sentiment-2026",
  "/governance",
  "/leicester",
  "/london",
  "/manchester",
  "/oxford",
  "/privacy",
  "/theory-of-change",
  "/track-record",
  "/west-of-england",
  "/what-is-pauseai-uk",
  "/blog",
  "/people",
];

export default function sitemap(): MetadataRoute.Sitemap {
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
