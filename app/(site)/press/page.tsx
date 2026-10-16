import { pageMetadata } from "@/lib/metadata";
import "../track-record/track-record.css";
import "./press.css";
import PressKit from "./_components/PressKit";
import PageHero from "@/components/ui/PageHero";

export const metadata = pageMetadata({
  title: "Press",
  description: "Media contact, boilerplate, brand assets, and press coverage of PauseAI UK.",
  path: "/press",
});

export default function PressPage() {
  return (
    <>
      <main className="track-record press">
        <PageHero
          title="Press"
          lede="Resources for journalists covering PauseAI UK and the movement for safe, equitable AI."
        />

        <PressKit />
      </main>
    </>
  );
}
