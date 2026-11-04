import type { Metadata } from "next";
import Briefing from "@/components/briefings/Briefing";
import JsonLd from "@/components/layout/JsonLd";
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
        <Briefing briefing={briefing} section={BRIEFINGS} />
      </main>
    </>
  );
}
