import { BLOG, newestFirst, posts } from "@/lib/content/blog";
import { postsFeed } from "@/lib/content/posts-feed";

export const dynamic = "force-static";

/** The blog's Atom feed, every post newest first. */
export function GET(): Response {
  return new Response(postsFeed(newestFirst(posts), BLOG), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
