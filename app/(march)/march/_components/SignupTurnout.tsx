import Image from "next/image";
import type { CSSProperties } from "react";
import { march } from "@/lib/content/march";
import { m } from "./classes";

/* The turnout story, as three numbers: the trend is the argument for showing up. */
const TURNOUT = [
  { figure: "60", label: "Jun 2025", note: "Our biggest protest that year", target: false },
  { figure: "300", label: "Feb 2026", note: "Five times bigger", target: false },
  { figure: "1,000", label: march.dateCompact, note: "The goal this time", target: true },
];

/*
 * Coverage of earlier PauseAI protests and of the movement, behind
 * "newspapers will publish photos of it": monochrome copies of each outlet's
 * wordmark (public/images/march-signup/press, from Wikimedia Commons, The
 * Independent's from English Wikipedia). `h` is each logo's height, set by eye
 * so wide and stacked marks weigh the same. On phones they sit three over two,
 * in this order.
 */
const PRESS = [
  {
    outlet: "MIT Technology Review",
    href: "https://www.technologyreview.com/2026/03/02/1133814/i-checked-out-londons-biggest-ever-anti-ai-protest/",
    logo: "mit-technology-review.svg",
    width: 184,
    height: 92,
    h: 46,
  },
  {
    outlet: "The Guardian",
    href: "https://www.theguardian.com/technology/2026/mar/06/uk-arts-must-not-be-sacrificed-for-speculative-ai-gains-peers-say",
    logo: "the-guardian.svg",
    width: 295,
    height: 97,
    h: 40,
  },
  {
    outlet: "WIRED",
    href: "https://www.wired.it/article/movimenti-contro-intelligenza-artificiale-mappa-nomi-pauseai-stopai-controlai/",
    logo: "wired.svg",
    width: 125,
    height: 25,
    h: 26,
  },
  {
    outlet: "The Independent",
    href: "https://www.the-independent.com/tech/ai-safety-declaration-steve-bannon-b2932570.html",
    logo: "the-independent.svg",
    width: 4909,
    height: 351,
    h: 20,
  },
  {
    outlet: "The Wall Street Journal",
    href: "https://www.wsj.com/tech/ai/ai-companies-public-relations-ae312d79",
    logo: "wsj.svg",
    width: 797,
    height: 68,
    h: 19,
  },
];

/** We get bigger every time: the three turnouts, the last the goal, and the press that covered them. */
export default function SignupTurnout() {
  return (
    <section className={m("band band-ink")}>
      <div className={m("container")}>
        <h2 className={m("h-md turnout-head")}>We get bigger every time</h2>
        <p className={m("turnout-intro")}>
          For the past 3 years, PauseAI UK has consistently held the largest rallies for AI safety in the world. Each
          time is bigger than the last and this march will be no exception.
        </p>
        <ol className={m("turnout-grid")}>
          {TURNOUT.map((step) => (
            <li className={m(step.target ? "turnout-step is-target" : "turnout-step")} key={step.label}>
              <p className={m("turnout-figure")}>{step.figure}</p>
              <p className={m("turnout-label")}>{step.label}</p>
              <p className={m("turnout-note")}>{step.note}</p>
            </li>
          ))}
        </ol>
        <p className={m("turnout-foot")}>
          If we all march together, newspapers will publish photos of it all over the world.
        </p>
        {/* The sentence above is the strip's label, so it needs no heading. */}
        <ul className={m("press")}>
          {PRESS.map((item) => (
            <li key={item.href}>
              <a className={m("press-link")} href={item.href} target="_blank" rel="noopener noreferrer">
                <Image
                  className={m("press-logo")}
                  src={`/images/march-signup/press/${item.logo}`}
                  alt={item.outlet}
                  width={item.width}
                  height={item.height}
                  style={{ "--logo-h": `${item.h}px` } as CSSProperties}
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
