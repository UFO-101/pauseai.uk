import { postsNewestFirst } from "@/lib/content/blog";
import { blogFeed } from "@/lib/content/blog-feed";

export const dynamic = "force-static";

/** The blog's Atom feed, every post newest first. */
export function GET(): Response {
  return new Response(blogFeed(postsNewestFirst()), {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
