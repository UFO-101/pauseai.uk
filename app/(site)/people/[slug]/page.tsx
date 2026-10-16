import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPerson, people, personMetadata, personSlug } from "@/lib/content/people";
import PersonHeader from "../_components/PersonHeader";
import PersonStory from "../_components/PersonStory";
import ShareYourStory from "../_components/ShareYourStory";
import "../people.css";

export function generateStaticParams() {
  return people.map((person) => ({ slug: personSlug(person) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const found = findPerson(slug);
  if (!found) return {};

  return personMetadata(found.person);
}

export default async function StoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findPerson(slug);
  if (!found) notFound();

  const { person } = found;

  return (
    <>
      <main className="people-page person-detail-page">
        <PersonHeader person={person} />

        <PersonStory person={person} slug={slug} />

        <ShareYourStory />
      </main>
    </>
  );
}
