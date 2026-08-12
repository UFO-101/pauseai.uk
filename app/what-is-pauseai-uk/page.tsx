import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "../track-record/track-record.css";
import "./what-is-pauseai-uk.css";

export const metadata: Metadata = {
  title: "What is PauseAI UK?",
  description:
    "PauseAI UK is focused on the risks of superhuman AI — and why a narrow focus makes it easier for people with a wide range of beliefs to collaborate.",
  openGraph: {
    title: "What is PauseAI UK?",
    description:
      "PauseAI UK is focused on the risks of superhuman AI — and why a narrow focus makes it easier for people with a wide range of beliefs to collaborate.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/what-is-pauseai-uk/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/what-is-pauseai-uk" },
};

export default function WhatIsPauseAIUKPage() {
  return (
    <>
      <Nav />
      <main className="track-record what-is-pauseai-uk">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">What is PauseAI UK?</h1>
            <p className="tr-hero-lede">
              We are the civic movement dedicated to averting the risks of superhuman AI.
            </p>
          </div>
        </section>

        <article className="intro-article">
          <div className="container intro-inner">
            <section className="intro-section">
              <p>
                PauseAI is a civic movement, which means that we help citizens organise to take collective actions and make
                their voice heard. Our volunteers engage with their MPs about AI safety, march in protests, join
                conferences about AI safety in the European and UK Parliaments and gather signatures for open letters.
              </p>

              <p>
                PauseAI is focused on the risks of <strong>superhuman AI</strong>. This focus is the thing that is unique about PauseAI
                UK and distinguishes us from other movements in the UK.
              </p>

              <p><b>Human extinction</b> is at the top of our list of concerns around superhuman AI, but there are many others including:</p>
              <ul className="intro-list">
                <li>job loss and concentration of power</li>
                <li>autonomous weapons</li>
                <li>surveillance and authoritarianism</li>
                <li>addiction, enfeeblement and psychosis</li>
              </ul>

              <p>
                This focus is narrower than all possible concerns about AI in general. The advantage of having a very narrow
                focus is that is makes it easier for people with a wide range of beliefs to collaborate, because we
                don&rsquo;t have to agree on everything. We just have to agree that superhuman AI is a big risk and that
                we should regulate, slow down and pause to ensure AI development is safe and equitable.
              </p>

              <p>
                In PauseAI UK, we have a policy of not using AI art or AI writing on our website or any of our public
                materials. But we do use AI for coding and other tasks.
              </p>

              <p>
                We collaborate closely with{" "}
                <a href="https://pulltheplug.uk/" target="_blank" rel="noreferrer">
                  Pull the Plug
                </a>
                , which is a group focused on the existing harms of AI. Our last protest was a joint event with them and
                our next protest will be too. When you come to a PauseAI / Pull the Plug protest, you can view yourself
                as a representative of one group in a coalition. Or you can see yourself as a supporter of all the AI
                issues represented by the coalition.
              </p>

              <p>The hope is that when you go to a PauseAI event, you go in with the understanding:</p>
              <ol className="intro-list">
                <li>The focus is on superhuman AI.</li>
                <li>
                  Anyone concerned about superhuman AI is welcome, including those who are even more concerned about the
                  current harms of AI, or the climate, or any other issue.
                </li>
              </ol>
            </section>
          </div>
        </article>
      </main>
    </>
  );
}
