import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import Nav from "@/components/Nav";
import { findPost, formatPostDate, postAuthor, posts } from "@/lib/data/blog";
import { site } from "@/lib/data/site";
import { parseCssStyle } from "@/lib/storyRender";
import "../../track-record/track-record.css";
import "../blog.css";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.tldr,
    openGraph: {
      title: post.title,
      description: post.tldr,
      images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
      url: `https://pauseai.uk/blog/${slug}/`,
      type: "article",
    },
    twitter: {
      images: ["/images/open-graph/open-graph-1600-840.jpg"],
    },
    alternates: { canonical: `/blog/${slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();

  const author = postAuthor(post);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.tldr,
    datePublished: post.date,
    url: `${site.url}/blog/${slug}`,
    mainEntityOfPage: `${site.url}/blog/${slug}`,
    image: `${site.url}/images/open-graph/open-graph-1200-630.jpg`,
    author: author
      ? { "@type": "Person", name: post.author, url: `${site.url}/people/${author.slug}` }
      : { "@type": "Organization", name: "PauseAI UK" },
    publisher: {
      "@type": "Organization",
      name: "PauseAI UK",
      logo: { "@type": "ImageObject", url: `${site.url}/favicon/web-app-manifest-512x512.png` },
    },
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <Nav />
      <main className="track-record blog">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <Link className="blog-back-link" href="/blog/">
              ← All posts
            </Link>
            <h1 className="tr-hero-title blog-post-title">{post.title}</h1>
            <div className="blog-byline">
              {author?.person.imageSrc && (
                <Link
                  href={`/people/${author.slug}/`}
                  className="blog-byline-avatar"
                  style={{ backgroundImage: `url("${author.person.imageSrc}")`, ...parseCssStyle(author.person.imageStyle ?? "") }}
                  aria-label={`Read ${post.author}'s story`}
                />
              )}
              <span className="blog-byline-text">
                {author ? <Link href={`/people/${author.slug}/`}>{post.author}</Link> : post.author}
                {" · "}
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              </span>
            </div>
          </div>
        </section>

        <article className="blog-article">
          <div className="container blog-inner">
            {post.tldrContent && (
              <p className="blog-tldr">
                <strong>TL;DR</strong> {post.tldrContent}
              </p>
            )}
            <div className="blog-body">{post.content}</div>
          </div>
        </article>
      </main>
    </>
  );
}
