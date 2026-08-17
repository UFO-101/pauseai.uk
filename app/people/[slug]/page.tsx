import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyLinkButton from "@/components/CopyLinkButton";
import Nav from "@/components/Nav";
import StoryShareForm from "@/components/StoryShareForm";
import { people, personSlug } from "@/lib/data/people";
import { site } from "@/lib/data/site";
import { avatarFallback, parseCssStyle, renderBody } from "@/lib/storyRender";
import "../../track-record/track-record.css";
import "../people.css";

function findPerson(slug: string) {
  const index = people.findIndex((person, i) => personSlug(person, i) === slug);
  if (index === -1) return null;
  return { person: people[index], index };
}

export function generateStaticParams() {
  return people.map((person, i) => ({ slug: personSlug(person, i) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = findPerson(slug);
  if (!found) return {};

  const { person } = found;
  const title = person.name || "Anonymous submission";
  const plainFirstParagraph = person.paragraphs[0]?.replace(/<[^>]+>/g, "") ?? "";
  const description =
    plainFirstParagraph.length > 160 ? `${plainFirstParagraph.slice(0, 157).trimEnd()}…` : plainFirstParagraph;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
      url: `https://pauseai.uk/people/${slug}/`,
    },
    twitter: {
      images: ["/images/open-graph/open-graph-1600-840.jpg"],
    },
    alternates: { canonical: `/people/${slug}` },
  };
}

export default async function StoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findPerson(slug);
  if (!found) notFound();

  const { person } = found;

  return (
    <>
      <Nav />
      <main className="track-record people-page person-detail-page">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <Link className="story-back-link" href="/people">
              ← Back to all stories
            </Link>
            <div className="person-detail-heading">
              {person.imageSrc ? (
                <div
                  className="person-detail-avatar"
                  style={{ backgroundImage: `url("${person.imageSrc}")`, ...parseCssStyle(person.imageStyle ?? "") }}
                ></div>
              ) : (
                <div className="person-detail-avatar person-avatar-initials" aria-hidden="true">
                  {avatarFallback(person.name)}
                </div>
              )}
              <div className="person-detail-title-wrap">
                <h1 className="tr-hero-title">{person.name || "Anonymous submission"}</h1>
              </div>
            </div>
          </div>
        </section>

        <section className="people-page-grid">
          <div className="container person-detail-grid">
            <div className="story-body">{renderBody(person.paragraphs, true)}</div>
            <div className="story-teaser-cta">
              <CopyLinkButton slug={slug} label="Share this story" />
            </div>
          </div>
        </section>

        <section className="people-page-share">
          <div className="container">
            <div className="section-header">
              <h2>Share your story</h2>
              <p className="section-lede">
                Why did you get involved, or what are your own concerns about AI?
              </p>
              <p className="section-lede">
                Tell us in your own words, we may feature it on this page. Connect with others who have similar stories in{" "}
                <a className="inline-link" href={site.whatsappUrl} target="_blank" rel="noreferrer">
                  our community
                </a>
                .
              </p>
            </div>
            <StoryShareForm />
          </div>
        </section>
      </main>
    </>
  );
}
