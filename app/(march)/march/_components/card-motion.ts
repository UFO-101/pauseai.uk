import type { AnimationEvent } from "react";

/** Where a card in the register band is in its swap (SignupFlow.tsx): still, animating out, or in. */
export type CardMotion = "still" | "leaving" | "entering";

/**
 * The attributes a card takes for its motion: which animation the stylesheet
 * plays, no focus or clicks while it goes, and `onLeft` once its own
 * animation (not one inside it) has finished.
 */
export function cardMotionProps(motion: CardMotion, onLeft: () => void) {
  return {
    "data-motion": motion === "still" ? undefined : motion,
    inert: motion === "leaving",
    onAnimationEnd: (event: AnimationEvent<HTMLElement>) => {
      if (motion === "leaving" && event.target === event.currentTarget) onLeft();
    },
  };
}
