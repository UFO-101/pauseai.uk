import { pageMetadata } from "@/lib/metadata";
import ShareYourStory from "./_components/ShareYourStory";
import StoryGrid from "./_components/StoryGrid";
import "./people.css";
import PageHero from "@/components/ui/PageHero";

export const metadata = pageMetadata({
  title: "People",
  description: "Why our volunteers and members got involved with PauseAI UK, in their own words.",
  path: "/people",
});

export default function PeoplePage() {
  return (
    <>
      <main className="people-page">
        <PageHero
          title="People"
          lede="Each of us found PauseAI for our own reasons. Read stories from our volunteers and members across our local groups."
        />

        <StoryGrid />

        <ShareYourStory id="share-your-story" />
      </main>
    </>
  );
}
