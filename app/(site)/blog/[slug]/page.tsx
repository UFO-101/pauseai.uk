import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/layout/JsonLd";
import { findPost, postJsonLd, postMetadata, posts } from "@/lib/content/blog";
import PostBody from "../_components/PostBody";
import PostHeader from "../_components/PostHeader";
import "../../track-record/track-record.css";
import "../blog.css";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return {};
  return postMetadata(post);
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();

  return (
    <>
      <JsonLd data={postJsonLd(post)} />
      <main className="track-record blog">
        <PostHeader post={post} />

        <PostBody post={post} />
      </main>
    </>
  );
}
