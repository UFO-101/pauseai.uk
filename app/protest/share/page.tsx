import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ProtestShare from "./ProtestShare";
import "./share.css";

const DESCRIPTION =
  "You're registered for the 5 December march. Now bring people with you.";

export const metadata: Metadata = {
  title: "PauseAI UK | You're registered — now share the march",
  description: DESCRIPTION,
  // A step inside the registration flow, not a page anyone should land on
  // from search.
  robots: { index: false, follow: true },
  alternates: { canonical: "/protest/share" },
};

export default function ProtestSharePage() {
  return (
    <>
      <Nav />
      <main className="share-page">
        <section className="share-head">
          <div className="container">
            <p className="share-eyebrow">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              You&rsquo;ve registered
            </p>
            <h1>Now bring people with you</h1>
            <p className="lede">
              Please share with <strong>as many people/groups as you can think of</strong>, so we
                can make this march as big as possible!
            </p>
          </div>
        </section>

        <section className="share-body">
          <div className="container">
            <ProtestShare />
          </div>
        </section>
      </main>
    </>
  );
}
