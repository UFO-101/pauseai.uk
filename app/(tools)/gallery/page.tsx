import { pageMetadata } from "@/lib/metadata";
import GalleryIndex from "./_components/GalleryIndex";
import { requireGallery } from "./_components/enabled";
import { GROUPS } from "./_examples";

// Every component and its variants on fixture data, a page per group, for the
// storyboard to picture (plans/component-gallery.md). Only fixture builds
// have it.
export const metadata = {
  ...pageMetadata({ title: "Component gallery", description: "Every component.", path: "/gallery" }),
  robots: { index: false, follow: false },
};

export default function GalleryPage() {
  requireGallery();
  return <GalleryIndex groups={GROUPS} />;
}
