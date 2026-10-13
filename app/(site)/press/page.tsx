import { pageMetadata } from "@/lib/metadata";
import "../track-record/track-record.css";
import "./press.css";
import PressKit from "./_components/PressKit";

export const metadata = pageMetadata({
  title: "Press",
  description: "Media contact, boilerplate, brand assets, and press coverage of PauseAI UK.",
  path: "/press",
});

export default function PressPage() {
  return (
    <>
      <main className="track-record press">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Press</h1>
            <p className="tr-hero-lede">
              Resources for journalists covering PauseAI UK and the movement for safe, equitable AI.
            </p>
          </div>
        </section>

        <PressKit />
      </main>
    </>
  );
}
