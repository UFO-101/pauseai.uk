import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PersonCard from "@/components/PersonCard";
import StoryShareForm from "@/components/StoryShareForm";
import { isLongStory, LONG_STORY_CHAR_THRESHOLD, people } from "@/lib/data/people";
import { site } from "@/lib/data/site";
import "../track-record/track-record.css";
import "./people.css";

export const metadata: Metadata = {
  title: "PauseAI UK | People",
  description: "Why our volunteers and members got involved with PauseAI UK, in their own words.",
  openGraph: {
    title: "PauseAI UK | People",
    description: "Why our volunteers and members got involved with PauseAI UK, in their own words.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/people/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/people" },
};

export default function PeoplePage() {
  return (
    <>
      <Nav />
      <main className="track-record people-page">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">People</h1>
            <p className="tr-hero-lede">
              Each of us found PauseAI for our own reasons. Read stories from our volunteers and members across our chapters.
            </p>
          </div>
        </section>

        <section className="people-page-grid">
          <div className="container">
            <div className="people-grid">
              {people.map((person, i) => (
                <PersonCard
                  key={`${person.name}-${i}`}
                  person={person}
                  index={i}
                  truncate={isLongStory(person)}
                  maxChars={LONG_STORY_CHAR_THRESHOLD}
                  showLink
                />
              ))}
            </div>
          </div>
        </section>

        <section id="share-your-story" className="people-page-share">
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
