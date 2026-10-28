import JsonLd from "@/components/layout/JsonLd";
import { march, marchEventJsonLd } from "@/lib/content/march";
import { pageMetadata } from "@/lib/metadata";
import { getMarchSignupCount } from "@/lib/server/march-event";
import SignupCase from "./_components/SignupCase";
import SignupDay from "./_components/SignupDay";
import SignupDemand from "./_components/SignupDemand";
import MarchSignups from "./_components/MarchSignups";
import SignupHero from "./_components/SignupHero";
import SignupPhotos from "./_components/SignupPhotos";
import SignupRegister from "./_components/SignupRegister";
import SignupTurnout from "./_components/SignupTurnout";

export const metadata = pageMetadata({
  title: `${march.name} — ${march.dateShort}, ${march.city}`,
  description: `Join the biggest ever march for AI safety. ${march.dateLong}, ${march.city} — organised by PauseAI UK.`,
  path: march.path,
  absoluteTitle: true,
  openGraph: { title: `${march.name} — ${march.dateLong}` },
  // Made by scripts/march-preview.mjs.
  images: {
    openGraph: { url: "/images/march-signup/open-graph-1200-630.jpg", width: 1200, height: 630 },
    twitter: "/images/march-signup/open-graph-1600-840.jpg",
  },
});

export default async function MarchSignupPage() {
  const signups = await getMarchSignupCount();
  return (
    <main id="main">
      <JsonLd data={marchEventJsonLd()} />
      <MarchSignups signups={signups}>
        <SignupHero />
        <SignupCase />
        <SignupDemand />
        <SignupTurnout />
        <SignupPhotos />
        <SignupDay />
        <SignupRegister />
      </MarchSignups>
    </main>
  );
}
