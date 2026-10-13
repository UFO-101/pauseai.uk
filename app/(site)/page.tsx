import { pageMetadata } from "@/lib/metadata";
import { getEvents } from "@/lib/server/luma-calendar";
import GetInvolved from "./_components/GetInvolved";
import HeroMarqueeEffects from "./_components/HeroMarqueeEffects";
import HomeHero from "./_components/HomeHero";
import JoinSection from "./_components/JoinSection";
import LocalGroupsSection from "./_components/LocalGroupsSection";
import PeopleSection from "./_components/PeopleSection";
import PressMarquee from "./_components/PressMarquee";
import ShopBanner from "./_components/ShopBanner";
import StaffSection from "./_components/StaffSection";
import UpcomingEvents from "./_components/UpcomingEvents";

export const metadata = pageMetadata({
  title: "PauseAI UK | Civic action on AI",
  description: "Community-led action for safe and accountable AI.",
  path: "/",
  absoluteTitle: true,
  openGraph: {
    title: "PauseAI UK",
    description: "Community-led action for safe and accountable AI across the UK.",
  },
});

export default async function HomePage() {
  const events = await getEvents();

  return (
    <>
      <main>
        <HomeHero />
        <UpcomingEvents events={events} />
        <PressMarquee />
        <LocalGroupsSection />
        <PeopleSection />
        <ShopBanner />
        <JoinSection />
        <GetInvolved />
        <StaffSection />
      </main>
      <HeroMarqueeEffects />
    </>
  );
}
