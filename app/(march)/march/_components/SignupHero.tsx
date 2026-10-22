"use client";

import Image from "next/image";
import { march } from "@/lib/content/march";
import { m } from "./classes";
import { useSignupHero } from "./MarchSignupFrame";
import SignupHeroScroll from "./SignupHeroScroll";

/** The sign-up page's first screen: the march's name, when and where, and the button to the form. */
export default function SignupHero() {
  const { setHero } = useSignupHero();
  return (
    <section ref={setHero} className={m("hero")}>
      <Image className={m("hero-photo")} src="/images/march-signup/hero-march.jpg" alt="" fill sizes="100vw" priority />
      <div className={m("hero-scrim")} aria-hidden="true" />

      <div className={m("container hero-inner")}>
        <Image
          className={m("hero-logo")}
          src="/images/logos/PauseAI-Logo-Transparent.svg"
          alt="PauseAI UK"
          width={178}
          height={48}
          priority
        />

        <h1 className={m("h-xl hero-title")}>
          <span>March Against</span>
          <span className={m("hero-title-hit")}>AI Extinction</span>
        </h1>

        <p className={m("hero-lede")}>Join us for the biggest ever AI safety protest.</p>

        <div className={m("hero-facts")}>
          <div className={m("hero-fact")}>
            <p className={m("hero-fact-label")}>When</p>
            <p className={m("hero-fact-main")}>
              <time dateTime={march.dateIso}>{march.dateLong}</time>
            </p>
            <p className={m("hero-fact-sub")}>{march.time}</p>
          </div>
          <div className={m("hero-fact")}>
            <p className={m("hero-fact-label")}>Where</p>
            <p className={m("hero-fact-main")}>{march.city}</p>
            <p className={m("hero-fact-sub")}>
              {march.start.name}
              <svg className={m("route-arrow")} viewBox="0 0 24 24" role="img" aria-label="to">
                <path
                  d="M3 12h16M12 5l7 7-7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="square"
                />
              </svg>
              {march.end.name}
            </p>
          </div>
        </div>

        <div className={m("hero-cta")}>
          <a className={m("btn large on-ink")} href="#register">
            Register now
          </a>
        </div>
      </div>
      <SignupHeroScroll />
    </section>
  );
}
