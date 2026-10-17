import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import GalleryGroup from "../_components/GalleryGroup";
import { galleryGroup } from "../_components/enabled";
import { GROUPS } from "../_examples";

export function generateStaticParams() {
  return GROUPS.map((group) => ({ group: group.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }): Promise<Metadata> {
  const group = galleryGroup(GROUPS, (await params).group);
  return {
    ...pageMetadata({ title: `${group.title} gallery`, description: "Every component.", path: `/gallery/${group.id}` }),
    robots: { index: false, follow: false },
  };
}

// One group of the gallery: its components and their variants.
export default async function GalleryGroupPage({ params }: { params: Promise<{ group: string }> }) {
  return <GalleryGroup group={galleryGroup(GROUPS, (await params).group)} />;
}
