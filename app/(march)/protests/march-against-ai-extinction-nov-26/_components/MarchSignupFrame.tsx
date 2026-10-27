"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { m } from "./classes";

type Hero = { hero: HTMLElement | null; setHero: (hero: HTMLElement | null) => void };

const HeroContext = createContext<Hero>({ hero: null, setHero: () => {} });

/** The sign-up page's hero, for the header to watch and the scroll cue to glide past. */
export function useSignupHero(): Hero {
  return useContext(HeroContext);
}

/**
 * The march sign-up's frame (../layout.tsx): its type, colours and element
 * styles, and the hero's element for the pieces that need it.
 */
export default function MarchSignupFrame({ children }: { children: ReactNode }) {
  const [hero, setHero] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ hero, setHero }), [hero]);
  return (
    <HeroContext value={value}>
      <div className={m("frame")}>
        <a className={m("skip-link")} href="#main">
          Skip to content
        </a>
        {children}
      </div>
    </HeroContext>
  );
}
