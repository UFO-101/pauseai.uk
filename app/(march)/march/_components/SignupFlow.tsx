"use client";

import { useEffect, useRef, useState } from "react";
import type { MarchRegisterResult } from "@/lib/march-registration";
import { rememberArrivalTags } from "./arrival-tags";
import type { CardMotion } from "./card-motion";
import { m } from "./classes";
import ShareCard from "./ShareCard";
import SignupForm from "./SignupForm";
import { registerForMarch } from "./register";
import ThanksCard from "./ThanksCard";

type Card = "form" | "share" | "thanks";

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The register band's cards, one at a time, each swapped in place for the
 * next: the form, then, once registered, the share card, then a thank-you,
 * which can start the form again for someone else. `register` sends the
 * form; it's app/api/march/register unless a test or the gallery gives one.
 */
export default function SignupFlow({
  register = registerForMarch,
}: {
  register?: (input: unknown) => Promise<MarchRegisterResult>;
}) {
  const [card, setCard] = useState<Card>("form");
  const [motion, setMotion] = useState<CardMotion>("still");
  const [next, setNext] = useState<Card>("form");
  // How many swaps there have been, so the first card isn't scrolled to or focused.
  const [swaps, setSwaps] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  function arrive(to: Card) {
    setCard(to);
    setMotion(reducedMotion() ? "still" : "entering");
    setSwaps((n) => n + 1);
  }

  function goTo(to: Card) {
    if (reducedMotion()) return arrive(to);
    setNext(to);
    setMotion("leaving");
  }

  useEffect(rememberArrivalTags, []);

  // The button pressed has gone, so focus (and the screen reader) goes to the
  // new card. focus() alone scrolls badly, so the card's top is first scrolled
  // to the top of the window, under the header (the page's scroll-padding),
  // then the card is focused without scrolling. Not "nearest": a card taller
  // than the window below the header, like the share card on a phone, would
  // be scrolled only until its bottom showed, its top left out of sight.
  useEffect(() => {
    if (swaps === 0) return;
    wrap.current!.scrollIntoView({ block: "start", behavior: reducedMotion() ? "instant" : "smooth" });
    wrap.current!.querySelector<HTMLElement>("[data-focus-first]")!.focus({ preventScroll: true });
  }, [swaps]);

  const onLeft = () => arrive(next);
  return (
    <div ref={wrap} className={m("card-wrap")}>
      {card === "form" && (
        <SignupForm register={register} onRegistered={() => goTo("share")} motion={motion} onLeft={onLeft} />
      )}
      {card === "share" && <ShareCard onFinish={() => goTo("thanks")} motion={motion} onLeft={onLeft} />}
      {card === "thanks" && <ThanksCard onRegisterAnother={() => goTo("form")} motion={motion} onLeft={onLeft} />}
    </div>
  );
}
