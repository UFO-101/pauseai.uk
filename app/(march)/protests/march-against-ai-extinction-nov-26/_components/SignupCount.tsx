import { marchSignupCopy } from "@/lib/content/march-signup";
import { m } from "./classes";

/**
 * How many have registered for the march, in the form's top corner, or
 * `onInk`, beside the hero's button; nothing when Luma can't say.
 */
export default function SignupCount({ count, onInk = false }: { count: number | null; onInk?: boolean }) {
  if (count === null) return null;
  return (
    <p className={m(onInk ? "signup-count signup-count-on-ink" : "signup-count")}>
      <span className={m("signup-count-figure")}>{count.toLocaleString("en-GB")}</span>{" "}
      <span className={m("signup-count-label")}>{marchSignupCopy.form.count}</span>
    </p>
  );
}
