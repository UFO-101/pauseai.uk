import { pageMetadata } from "@/lib/metadata";
import Timeline from "./_components/Timeline";
import Closing from "@/components/ui/Closing";
import PageHero from "@/components/ui/PageHero";

export const metadata = pageMetadata({
  title: "Track Record",
  description:
    "One year of PauseAI UK: two conferences, an open letter signed by 60+ politicians, a European Parliament event, and the largest AI protest in the world.",
  path: "/track-record",
});

export default function TrackRecordPage() {
  return (
    <main>
      <PageHero title="Track Record" swirl />

      <Timeline />

      <Closing line="Join us for what comes next." />
    </main>
  );
}
