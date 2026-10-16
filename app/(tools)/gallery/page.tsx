import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";
import Gallery from "./_components/Gallery";
import { galleryEnabled } from "./_components/enabled";
import { GROUPS } from "./_examples";

// Every component and its variants on fixture data, for the storyboard to
// picture (plans/component-gallery.md). Only fixture builds have it.
export const metadata = {
  ...pageMetadata({ title: "Component gallery", description: "Every component.", path: "/gallery" }),
  robots: { index: false, follow: false },
};

export default function GalleryPage() {
  if (!galleryEnabled()) notFound();
  return <Gallery groups={GROUPS} />;
}
