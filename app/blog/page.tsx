import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import { formatPostDate, postAuthor, posts } from "@/lib/data/blog";
import { parseCssStyle } from "@/lib/storyRender";
import "../track-record/track-record.css";
import "./blog.css";

export const metadata: Metadata = {
  title: "PauseAI UK | Blog",
  description: "Writing from the PauseAI UK community on AI risk and what you can do about it.",
  openGraph: {
    title: "PauseAI UK | Blog",
    description: "Writing from the PauseAI UK community on AI risk and what you can do about it.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/blog/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <>
      <Nav />
      <main className="track-record blog">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Blog</h1>
          </div>
        </section>

        <section className="blog-list-section">
          <div className="container blog-inner">
            <ul className="blog-list">
              {posts.map((post) => {
                const author = postAuthor(post);
                return (
                  <li key={post.slug} className="blog-list-item">
                    <Link href={`/blog/${post.slug}/`} className="blog-list-link">
                      <h2 className="blog-list-title">{post.title}</h2>
                      <p className="blog-list-meta">
                        {author?.person.imageSrc && (
                          <span
                            className="blog-list-avatar"
                            style={{
                              backgroundImage: `url("${author.person.imageSrc}")`,
                              ...parseCssStyle(author.person.imageStyle ?? ""),
                            }}
                            aria-hidden="true"
                          />
                        )}
                        {post.author} · {formatPostDate(post.date)}
                      </p>
                      <p className="blog-list-tldr">{post.tldr}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
