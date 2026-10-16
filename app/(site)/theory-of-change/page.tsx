import { pageMetadata } from "@/lib/metadata";
import "../track-record/track-record.css";
import "./theory-of-change.css";
import Foreword from "./_components/Foreword";
import ChangeSteps from "./_components/ChangeSteps";
import Closing from "./_components/Closing";
import PageHero from "@/components/ui/PageHero";

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
        <PageHero title="Theory of Change" />

        <Foreword />

        <ChangeSteps />

        <Closing />
      </main>
    </>
  );
}
