import { notFound } from "next/navigation";
import { found } from "@/lib/found";
import type { Group } from "./types";

/** Only fixture builds have a gallery: its forms and examples aren't for the public. */
export function galleryEnabled(): boolean {
  return process.env.DATA_FIXTURES === "1";
}

/** A 404 outside a fixture build. */
export function requireGallery(): void {
  if (!galleryEnabled()) notFound();
}

/** The group a page's URL names, or a 404: outside a fixture build, or no such group. */
export function galleryGroup(groups: Group[], id: string): Group {
  requireGallery();
  return found(groups.find((group) => group.id === id));
}
