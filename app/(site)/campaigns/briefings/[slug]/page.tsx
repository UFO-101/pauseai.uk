import type { Metadata } from "next";
import JsonLd from "@/components/layout/JsonLd";
import PostBody from "@/components/posts/PostBody";
import PostHeader from "@/components/posts/PostHeader";
import { postJsonLd, postMetadata } from "@/lib/content/blog";
import { BRIEFINGS, briefings, findBriefing } from "@/lib/content/briefings";
import { found } from "@/lib/found";

export function generateStaticParams() {
  return briefings.map((briefing) => ({ slug: briefing.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return postMetadata(found(findBriefing(slug)), BRIEFINGS);
}

export default async function BriefingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const briefing = found(findBriefing(slug));

  return (
    <>
      <JsonLd data={postJsonLd(briefing, BRIEFINGS)} />
      <main>
        <PostHeader post={briefing} section={BRIEFINGS} />

        <PostBody post={briefing} />
      </main>
    </>
  );
}
