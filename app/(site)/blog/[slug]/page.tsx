import type { Metadata } from "next";
import JsonLd from "@/components/layout/JsonLd";
import { findPost, postJsonLd, postMetadata, posts } from "@/lib/content/blog";
import { found } from "@/lib/found";
import PostBody from "../_components/PostBody";
import PostHeader from "../_components/PostHeader";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return postMetadata(found(findPost(slug)));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = found(findPost(slug));

  return (
    <>
      <JsonLd data={postJsonLd(post)} />
      <main>
        <PostHeader post={post} />

        <PostBody post={post} />
      </main>
    </>
  );
}
