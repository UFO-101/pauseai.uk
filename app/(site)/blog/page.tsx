import { pageMetadata } from "@/lib/metadata";
import { postsNewestFirst } from "@/lib/content/blog";
import { site } from "@/lib/content/site";
import PostList from "./_components/PostList";
import PageHero from "@/components/ui/PageHero";

export const metadata = pageMetadata({
  title: "Blog",
  description: "Writing from the PauseAI UK community on AI risk and what you can do about it.",
  path: "/blog",
});

export default function BlogIndexPage() {
  return (
    <>
      <main>
        <PageHero
          title="Blog"
          width="wide"
          lede={
            <>
              This blog is written by PauseAI Volunteers. If you would like to contribute a piece, email{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> to chat with us about your ideas.
            </>
          }
        />

        <PostList posts={postsNewestFirst()} />
      </main>
    </>
  );
}
