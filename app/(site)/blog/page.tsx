import { pageMetadata } from "@/lib/metadata";
import { postsNewestFirst } from "@/lib/content/blog";
import { site } from "@/lib/content/site";
import PostList from "./_components/PostList";
import "../track-record/track-record.css";
import "./blog.css";

export const metadata = pageMetadata({
  title: "Blog",
  description: "Writing from the PauseAI UK community on AI risk and what you can do about it.",
  path: "/blog",
});

export default function BlogIndexPage() {
  return (
    <>
      <main className="track-record blog blog-index">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Blog</h1>
            <p className="tr-hero-lede">
              This blog is written by PauseAI Volunteers. If you would like to contribute a piece, email{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> to chat with us about your ideas.
            </p>
          </div>
        </section>

        <PostList posts={postsNewestFirst()} />
      </main>
    </>
  );
}
