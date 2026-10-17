import { pageMetadata } from "@/lib/metadata";
import JobsArticle from "./_components/JobsArticle";
import PageHero from "@/components/ui/PageHero";

export const metadata = pageMetadata({
  title: "Jobs",
  description:
    "PauseAI UK is hiring: operations, software engineering, content, community organising, design and public affairs roles.",
  path: "/jobs",
  openGraph: { title: "Jobs at PauseAI UK" },
});

export default function JobsPage() {
  return (
    <>
      <main>
        <PageHero title="Jobs" lede="Work for PauseAI UK in a paid role." tight />

        <JobsArticle />
      </main>
    </>
  );
}
