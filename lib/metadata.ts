import type { Metadata } from "next";
import { site } from "@/lib/content/site";

export const OPEN_GRAPH_IMAGE = { url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 };
export const TWITTER_IMAGE = "/images/open-graph/open-graph-1600-840.jpg";

/**
 * Metadata for a public page: title, description, the shared social preview
 * images, and the canonical path. The social title defaults to
 * "PauseAI UK | <title>"; pass `openGraph` to change any of its fields.
 */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  openGraph,
}: {
  title: string;
  description: string;
  /** The page's path, e.g. "/governance". */
  path: string;
  /** Use `title` as is, without the " | PauseAI UK" suffix from the root layout. */
  absoluteTitle?: boolean;
  openGraph?: { title?: string; description?: string; url?: string };
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    openGraph: {
      title: `PauseAI UK | ${title}`,
      description,
      images: [OPEN_GRAPH_IMAGE],
      url: `${site.url}${path === "/" ? "/" : `${path}/`}`,
      ...openGraph,
    },
    twitter: {
      images: [TWITTER_IMAGE],
    },
    alternates: { canonical: path },
  };
}
