import { posts, type BlogPost } from "@/lib/content/blog";

/**
 * A post with no image, by the organisation, for the blog's tests and the
 * gallery. Its slug is a real post's, so its link goes somewhere.
 */
export const examplePost: BlogPost = {
  slug: posts[posts.length - 1].slug,
  title: "A post",
  date: "2026-05-01",
  author: "PauseAI UK",
  tldr: "In short.",
  content: <p>Body text.</p>,
};
