"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { march } from "@/lib/content/march";
import { m } from "./classes";
import { useSignupHero } from "./MarchSignupFrame";

/*
 * The march sign-up's header: the PauseAI logo, the march's name and the
 * register button, and no nav. Over the sign-up page's hero (`overHero`) it
 * stays out of the way of the page's own title, and drops in once the hero
 * has scrolled away; the server renders it hidden, so it never flashes in
 * before hydration. Without a hero it's an ordinary sticky header.
 */
export default function SignupHeader({ overHero }: { overHero: boolean }) {
  const { hero } = useSignupHero();
  const [pastHero, setPastHero] = useState(false);
  const header = useRef<HTMLElement>(null);

  // The site's stylesheet keeps in-page anchors clear of the header by its height.
  useEffect(() => {
    const syncHeight = () => {
      document.documentElement.style.setProperty("--site-header-h", `${header.current!.offsetHeight}px`);
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(header.current!);
    return () => observer.disconnect();
  }, []);

  // Scrolling covers most of it; the observer catches the hero moving under
  // a still window, as when its photo loads or a scroll is restored.
  useEffect(() => {
    if (!hero) return;
    // Within a pixel: the glide past the hero stops at its whole-pixel height,
    // which can be a fraction short of a hero sized in svh.
    const update = () => setPastHero(hero.getBoundingClientRect().bottom < 1);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = new IntersectionObserver(update, { threshold: 0 });
    observer.observe(hero);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [hero]);

  return (
    <header
      ref={header}
      className={m("site-header")}
      data-over-hero={overHero || undefined}
      data-visible={(overHero && pastHero) || undefined}
    >
      <div className={m("container")}>
        <div className={m("site-brand")}>
          <Link className={m("site-brand-logo")} href="/" aria-label="PauseAI UK">
            <Image src="/images/logos/PauseAI-Logo-Transparent.svg" alt="" width={178} height={48} priority />
          </Link>
          <Link className={m("site-wordmark")} href={march.signupPath}>
            March Against <span className={m("site-wordmark-hit")}>AI Extinction</span>
          </Link>
        </div>
        <Link className={m("btn header-cta")} href={`${march.signupPath}#register`}>
          Register
        </Link>
      </div>
    </header>
  );
}
