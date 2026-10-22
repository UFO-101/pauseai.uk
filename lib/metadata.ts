import type { Metadata } from "next";
import { site } from "@/lib/content/site";

export const OPEN_GRAPH_IMAGE = { url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 };
export const TWITTER_IMAGE = "/images/open-graph/open-graph-1600-840.jpg";

/** A page's social preview images: Open Graph's 1200×630 and X's 1600×840. */
type SocialImages = { openGraph: typeof OPEN_GRAPH_IMAGE; twitter: string };

/**
 * Metadata for a public page: title, description, the shared social preview
 * images, and the canonical path. The social title defaults to
 * "PauseAI UK | <title>"; pass `openGraph` to change any of its fields, and
 * `images` for a preview of the page's own.
 */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  openGraph,
  images = { openGraph: OPEN_GRAPH_IMAGE, twitter: TWITTER_IMAGE },
}: {
  title: string;
  description: string;
  /** The page's path, e.g. "/governance". */
  path: string;
  /** Use `title` as is, without the " | PauseAI UK" suffix from the root layout. */
  absoluteTitle?: boolean;
  openGraph?: { title?: string; description?: string; url?: string };
  images?: SocialImages;
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    openGraph: {
      title: `PauseAI UK | ${title}`,
      description,
      images: [images.openGraph],
      url: `${site.url}${path === "/" ? "/" : `${path}/`}`,
      ...openGraph,
    },
    twitter: {
      images: [images.twitter],
    },
    alternates: { canonical: path },
  };
}
