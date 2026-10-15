import { pageMetadata } from "@/lib/metadata";
import "../track-record/track-record.css";
import "./theory-of-change.css";
import Foreword from "./_components/Foreword";
import ChangeSteps from "./_components/ChangeSteps";
import Closing from "./_components/Closing";

export const metadata = pageMetadata({
  title: "Theory of Change",
  description:
    "How PauseAI UK plans to convert public concern about AI risk into political pressure for a global pause.",
  path: "/theory-of-change",
});

export default function TheoryOfChangePage() {
  return (
    <>
      <main className="track-record theory-of-change">
        <section className="tr-hero">
          <svg className="tr-hero-swirl" viewBox="0 0 600 600" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
            <g fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.55"></g>
          </svg>
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Theory of Change</h1>
          </div>
        </section>

        <Foreword />

        <ChangeSteps />

        <Closing />
      </main>
    </>
  );
}
