import { pageMetadata } from "@/lib/metadata";
import { BLOG, feedLink, newestFirst, posts } from "@/lib/content/blog";
import { site } from "@/lib/content/site";
import PostList from "@/components/posts/PostList";
import PageHero from "@/components/ui/PageHero";

const page = pageMetadata({
  title: "Blog",
  description: "Writing from the PauseAI UK community on AI risk and what you can do about it.",
  path: "/blog",
});

export const metadata = { ...page, alternates: { ...page.alternates, ...feedLink(BLOG) } };

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

        <PostList posts={newestFirst(posts)} section={BLOG} />
      </main>
    </>
  );
}
