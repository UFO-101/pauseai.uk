import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import Nav from "@/components/Nav";
import { formatPostDate, ORGANISATION_AVATAR, postAuthor, postImage, posts, type BlogPost } from "@/lib/data/blog";
import { site } from "@/lib/data/site";
import { parseCssStyle } from "@/lib/storyRender";
import "../track-record/track-record.css";
import "./blog.css";

export const metadata: Metadata = {
  title: "Blog",
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

// Newest post is the lead story, the next two sit beneath it as a pair, and
// everything older is a compact thumbnail list.
type CardVariant = "lead" | "secondary" | "row";

const MEDIA_SIZES: Record<CardVariant, string> = {
  lead: "(max-width: 860px) 100vw, 600px",
  secondary: "(max-width: 860px) 100vw, 530px",
  row: "(max-width: 600px) 112px, 200px",
};

function avatarStyle(post: BlogPost): CSSProperties | null {
  const author = postAuthor(post);
  if (!author) return { backgroundImage: `url("${ORGANISATION_AVATAR}")` };
  if (!author.person.imageSrc) return null;
  return { backgroundImage: `url("${author.person.imageSrc}")`, ...parseCssStyle(author.person.imageStyle ?? "") };
}

function PostCard({ post, variant }: { post: BlogPost; variant: CardVariant }) {
  const image = postImage(post);
  // Diagrams (the PNG figures) are shown whole on white; photos fill the frame.
  const isDiagram = image?.src.endsWith(".png") ?? false;
  const avatar = avatarStyle(post);
  const Title = variant === "row" ? "h3" : "h2";
  return (
    <Link href={`/blog/${post.slug}/`} className={`blog-card blog-card-${variant}${image ? "" : " no-media"}`}>
      {image && (
        <div className={`blog-card-media${isDiagram ? " is-diagram" : ""}`}>
          {/* Decorative here: the card's text already says what the post is. */}
          <Image src={image.src} alt="" fill sizes={MEDIA_SIZES[variant]} priority={variant === "lead"} />
        </div>
      )}
      <div className="blog-card-body">
        {variant === "lead" && <p className="blog-card-kicker">Latest</p>}
        <Title className="blog-card-title">{post.title}</Title>
        <p className="blog-card-tldr">{post.tldr}</p>
        <p className="blog-card-meta">
          {avatar && <span className="blog-card-avatar" style={avatar} aria-hidden="true" />}
          {post.author} · {formatPostDate(post.date)}
        </p>
      </div>
    </Link>
  );
}

export default function BlogIndexPage() {
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const [lead, ...rest] = sorted;
  const secondary = rest.slice(0, 2);
  const more = rest.slice(2);

  return (
    <>
      <Nav />
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

        <section className="blog-list-section">
          <div className="container blog-inner">
            {lead && <PostCard post={lead} variant="lead" />}

            {secondary.length > 0 && (
              <div className="blog-grid-secondary">
                {secondary.map((post) => (
                  <PostCard key={post.slug} post={post} variant="secondary" />
                ))}
              </div>
            )}

            {more.length > 0 && (
              <section className="blog-more" aria-labelledby="blog-more-heading">
                <h2 id="blog-more-heading" className="blog-more-heading">
                  More from the blog
                </h2>
                <ul className="blog-more-list">
                  {more.map((post) => (
                    <li key={post.slug}>
                      <PostCard post={post} variant="row" />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
