import PostList from "@/components/posts/PostList";
import PageHero from "@/components/ui/PageHero";
import { newestFirst } from "@/lib/content/blog";
import { BRIEFINGS, briefings } from "@/lib/content/briefings";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Briefings",
  description: "⁂ Our weekly briefings on AI news: what happened, in Parliament and beyond, and what's coming up.",
  path: "/campaigns/briefings",
});

export default function BriefingsIndexPage() {
  return (
    <main>
      <PageHero
        title="Briefings"
        width="wide"
        lede="⁂ Each week's AI news in one page: the key stories, what happened in Parliament, and the dates coming up."
      />

      <PostList posts={newestFirst(briefings)} section={BRIEFINGS} />
    </main>
  );
}
