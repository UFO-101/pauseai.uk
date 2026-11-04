import type { Metadata } from "next";
import JsonLd from "@/components/layout/JsonLd";
import { BLOG, findPost, postJsonLd, postMetadata, posts } from "@/lib/content/blog";
import { found } from "@/lib/found";
import PostBody from "@/components/posts/PostBody";
import PostHeader from "@/components/posts/PostHeader";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return postMetadata(found(findPost(slug)), BLOG);
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = found(findPost(slug));

  return (
    <>
      <JsonLd data={postJsonLd(post, BLOG)} />
      <main>
        <PostHeader post={post} section={BLOG} />

        <PostBody post={post} />
      </main>
    </>
  );
}
