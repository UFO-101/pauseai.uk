import Link from "next/link";
import { march } from "@/lib/content/march";
import { marchSignupCopy } from "@/lib/content/march-signup";
import { cardMotionProps, type CardMotion } from "./card-motion";
import { m } from "./classes";

const copy = marchSignupCopy.thanks;

/** The last card: thanks, where to manage the registration, and the form again for someone else. */
export default function ThanksCard({
  onRegisterAnother,
  motion,
  onLeft,
}: {
  onRegisterAnother: () => void;
  motion: CardMotion;
  onLeft: () => void;
}) {
  return (
    <div className={m("share-panel share-panel-done")} {...cardMotionProps(motion, onLeft)}>
      <h2 className={m("h-md")} tabIndex={-1} data-focus-first>
        Thank you for registering
      </h2>
      <p>
        You should receive an email shortly with a calendar invite. We&rsquo;ll send you an update with more info closer
        to the date.
      </p>
      <p>
        <a className={m("inline-link")} href={march.lumaUrl} target="_blank" rel="noreferrer">
          {copy.manage}
        </a>
      </p>
      <p>
        In the meantime, read more about who we are at{" "}
        <Link className={m("inline-link")} href="/">
          PauseAI UK
        </Link>
        , or about the risks of AI and our proposal at{" "}
        <a className={m("inline-link")} href="https://pauseai.info" target="_blank" rel="noreferrer">
          PauseAI.info
        </a>
        .
      </p>
      <p className={m("share-panel-done-date")}>
        See you on {march.dateLong} in {march.city}.
      </p>
      <button type="button" className={m("share-secondary")} onClick={onRegisterAnother}>
        {copy.registerAnother}
      </button>
    </div>
  );
}
