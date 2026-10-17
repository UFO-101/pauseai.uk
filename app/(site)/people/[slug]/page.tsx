import type { Metadata } from "next";
import { findPerson, people, personMetadata, personSlug } from "@/lib/content/people";
import { found } from "@/lib/found";
import PersonHeader from "../_components/PersonHeader";
import PersonStory from "../_components/PersonStory";
import ShareYourStory from "../_components/ShareYourStory";

export function generateStaticParams() {
  return people.map((person) => ({ slug: personSlug(person) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return personMetadata(found(findPerson(slug)).person);
}

export default async function StoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { person } = found(findPerson(slug));

  return (
    <>
      <main>
        <PersonHeader person={person} />

        <PersonStory person={person} slug={slug} />

        <ShareYourStory />
      </main>
    </>
  );
}
