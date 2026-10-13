import { pageMetadata } from "@/lib/metadata";
import "../track-record/track-record.css";
import "./what-is-pauseai-uk.css";
import About from "./_components/About";

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
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">What is PauseAI UK?</h1>
            <p className="tr-hero-lede">
              We are the civic movement dedicated to averting the risks of superhuman AI.
            </p>
          </div>
        </section>

        <About />
      </main>
    </>
  );
}
