import type { Metadata } from "next";
import PrivacyPolicy from "./_components/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PauseAI UK (Safe AI Alliance Ltd) collects, uses, and protects your personal data.",
  openGraph: {
    title: "Privacy Policy — PauseAI UK",
    url: "https://pauseai.uk/privacy",
  },
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <main>
        <PrivacyPolicy />
      </main>
    </>
  );
}
