import { march } from "@/lib/content/march";
import { pageMetadata } from "@/lib/metadata";
import SignupCase from "./_components/SignupCase";
import SignupDay from "./_components/SignupDay";
import SignupDemand from "./_components/SignupDemand";
import SignupHero from "./_components/SignupHero";
import SignupPhotos from "./_components/SignupPhotos";
import SignupRegister from "./_components/SignupRegister";
import SignupTurnout from "./_components/SignupTurnout";

export const metadata = pageMetadata({
  title: `${march.name} — ${march.dateShort}, ${march.city}`,
  description: `Join the biggest ever march for AI safety. ${march.dateLong}, ${march.city} — organised by PauseAI UK.`,
  path: march.signupPath,
  absoluteTitle: true,
  openGraph: { title: `${march.name} — ${march.dateLong}` },
});

export default function MarchSignupPage() {
  return (
    <main id="main">
      <SignupHero />
      <SignupCase />
      <SignupDemand />
      <SignupTurnout />
      <SignupPhotos />
      <SignupDay />
      <SignupRegister />
    </main>
  );
}
