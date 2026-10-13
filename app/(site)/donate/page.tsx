import { pageMetadata } from "@/lib/metadata";
import DonateIntro from "./_components/DonateIntro";
import DonateBottom from "./_components/DonateBottom";

export const metadata = pageMetadata({
  title: "Donate",
  description: "Support PauseAI UK — community-led action for safe and accountable AI.",
  path: "/donate",
  openGraph: {
    title: "Donate to PauseAI UK",
    description: "Support community-led action for safe and accountable AI across the UK.",
    url: "https://pauseai.uk/donate",
  },
});

export default function DonatePage() {
  return (
    <>
      <main>
        <DonateIntro />

        <DonateBottom />
      </main>
    </>
  );
}
