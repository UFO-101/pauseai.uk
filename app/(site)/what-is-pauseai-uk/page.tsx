import { pageMetadata } from "@/lib/metadata";
import "../track-record/track-record.css";
import "./what-is-pauseai-uk.css";
import About from "./_components/About";
import PageHero from "@/components/ui/PageHero";

export const metadata = pageMetadata({
  title: "What is PauseAI UK?",
  description: "We are the civic movement dedicated to averting the risks of superhuman AI.",
  path: "/what-is-pauseai-uk",
  absoluteTitle: true,
  openGraph: { title: "What is PauseAI UK?" },
});

export default function WhatIsPauseAIUKPage() {
  return (
    <>
      <main className="track-record what-is-pauseai-uk">
        <PageHero
          title="What is PauseAI UK?"
          lede="We are the civic movement dedicated to averting the risks of superhuman AI."
          tight
          longLede
        />

        <About />
      </main>
    </>
  );
}
