import { pageMetadata } from "@/lib/metadata";
import ShareYourStory from "./_components/ShareYourStory";
import StoryGrid from "./_components/StoryGrid";
import "../track-record/track-record.css";
import "./people.css";

export const metadata = pageMetadata({
  title: "People",
  description: "Why our volunteers and members got involved with PauseAI UK, in their own words.",
  path: "/people",
});

export default function PeoplePage() {
  return (
    <>
      <main className="track-record people-page">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">People</h1>
            <p className="tr-hero-lede">
              Each of us found PauseAI for our own reasons. Read stories from our volunteers and members across our
              local groups.
            </p>
          </div>
        </section>

        <StoryGrid />

        <ShareYourStory id="share-your-story" />
      </main>
    </>
  );
}
