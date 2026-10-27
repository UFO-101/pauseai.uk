"use client";

// Email your MP's examples that need state, callbacks, a campaign (which
// holds functions, so can't come from the server) or what the tool keeps in
// the browser: client components with no props, so the server-rendered
// gallery can place them.
import { CONTROLAI_LETTER_ASK } from "@/lib/asks";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { campaigns } from "@/lib/content/email-your-mp";
import { docFromMarkup, toText } from "@/lib/letter-format";
import {
  markSent,
  saveDraft,
  saveLookup,
  type Draft,
  type Lookup,
  type Sent,
} from "@/app/(site)/campaigns/_components/draft";
import { exampleDraft, exampleLookup, exampleMp } from "@/app/(site)/campaigns/_components/draft.examples";
import EmailYourMpTool from "@/app/(site)/campaigns/_components/EmailYourMpTool";
import LetterEditor from "@/app/(site)/campaigns/_components/LetterEditor";
import LetterForm from "@/app/(site)/campaigns/_components/LetterForm";
import LetterPreview from "@/app/(site)/campaigns/_components/LetterPreview";
import LetterSent from "@/app/(site)/campaigns/_components/LetterSent";
import LetterWrite from "@/app/(site)/campaigns/_components/LetterWrite";
import Turnstile, { type TurnstileApi } from "@/app/(site)/campaigns/_components/Turnstile";
import { Controlled, Logged } from "../_components/wiring";

const [letterToPm, bill] = campaigns;

// Each step reads what the one before kept in sessionStorage, once, as it
// mounts, and there's one lookup, draft and "sent" for the whole page. So
// each example's own are put there in turn: the next waits until the last
// example has mounted and read them.
let queue: Promise<void> = Promise.resolve();

/**
 * Keeps this lookup, and the draft or "sent" if given, as Email your MP would
 * have by now, then mounts the example, which reads them.
 */
export function Seeded({
  lookup,
  draft,
  sent,
  children,
}: {
  lookup: Lookup;
  draft?: Draft;
  sent?: Sent;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const release = useRef<() => void>(undefined);

  useEffect(() => {
    let done!: () => void;
    const turn = new Promise<void>((resolve) => (done = resolve));
    release.current = done;
    const previous = queue;
    // Its turn: once the example before has read its own. Unmounted before
    // then, it still keeps them, and the next example's overwrite them.
    void previous.then(() => {
      saveLookup(lookup);
      if (sent) markSent(sent);
      if (draft) saveDraft(draft);
      setReady(true);
    });
    queue = previous.then(() => turn);
    return done;
    // Once, as it mounts: the example reads them only then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The example's own effects, which read them, ran just before this one.
  useEffect(() => {
    if (ready) release.current!();
  }, [ready]);

  return ready ? children : null;
}

// Cloudflare's widget mustn't load here. As the storyboard's flows do
// (tests/steps.ts), this stands in for it: it hands over a token at once,
// which a fixture build's Turnstile accepts. It draws a box, so there's
// something to see where the widget goes.
const FAKE_TURNSTILE: TurnstileApi = {
  render: (element, options) => {
    const box = document.createElement("div");
    box.textContent = "Turnstile stand-in";
    box.style.cssText = "display:inline-block;padding:16px 24px;border:1px solid var(--border, #ccc)";
    element.append(box);
    setTimeout(() => (options.callback as (token: string) => void)("fixture-token"));
    return "fake";
  },
  remove: () => {},
};

/** Puts the stand-in in place, as the page loads, before the widget looks for it. */
function WithFakeTurnstile({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    (window as Window & { turnstile?: TurnstileApi }).turnstile = FAKE_TURNSTILE;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once, on load: there's no window on the server
    setInstalled(true);
  }, []);
  return installed ? children : null;
}

/** The lookup form, filled in from the last lookup. */
export function EmailYourMpToolExample() {
  return (
    <Seeded lookup={exampleLookup}>
      <EmailYourMpTool campaignSlug={letterToPm.slug} />
    </Seeded>
  );
}

/** The lookup form, listing the test MPs' postcodes, as outside production. */
export function EmailYourMpToolTestMpsExample() {
  return (
    <Seeded lookup={{ ...exampleLookup, address: "7 Fake Lane", postcode: "ZZ99ZZ" }}>
      <EmailYourMpTool campaignSlug={letterToPm.slug} showTestMps />
    </Seeded>
  );
}

const formProps = {
  mp: exampleMp,
  statuses: {},
  senderName: exampleLookup.name,
  address: exampleLookup.address,
  postcode: exampleLookup.postcode,
};

/** The PM's letter, with its attachments. */
export function LetterFormExample() {
  return <LetterForm campaign={letterToPm} {...formProps} />;
}

/** The bill's letter, which has none. */
export function LetterFormNoAttachmentsExample() {
  return <LetterForm campaign={bill} {...formProps} />;
}

const LETTER = docFromMarkup(
  "Dear Example MP,\n\nA paragraph with **bold** and _italic_ words.\n\n- A point\n- Another point\n\nYours sincerely,\nExample Author",
);

/** The editor, its letter as plain text beside it. */
export function LetterEditorExample() {
  const label = useId();
  const tips = useId();
  return (
    <Controlled initial={LETTER} show={toText}>
      {(value, set) => (
        <>
          <p id={label}>Letter</p>
          <p id={tips}>Bold, italic and bullet points.</p>
          <LetterEditor initial={value} onChange={set} labelledBy={label} describedBy={tips} />
        </>
      )}
    </Controlled>
  );
}

/** The PM's letter, with its attachments and the anti-spam check. */
export function LetterPreviewExample() {
  return (
    <WithFakeTurnstile>
      <Seeded lookup={exampleLookup} draft={exampleDraft}>
        <LetterPreview campaignSlug={letterToPm.slug} turnstileSiteKey="fixture" />
      </Seeded>
    </WithFakeTurnstile>
  );
}

/** The bill's letter, without attachments, and without Turnstile's keys. */
export function LetterPreviewPlainExample() {
  return (
    <Seeded lookup={{ ...exampleLookup, campaign: bill.slug }} draft={{ ...exampleDraft, campaign: bill.slug }}>
      <LetterPreview campaignSlug={bill.slug} />
    </Seeded>
  );
}

/** Thanks, naming the MP. */
export function LetterSentExample() {
  return (
    <Seeded lookup={exampleLookup} sent={{ campaign: letterToPm.slug, mpName: exampleMp.name }}>
      <LetterSent campaignSlug={letterToPm.slug} />
    </Seeded>
  );
}

/** The MP found, and the PM's letter to them. */
export function LetterWriteExample() {
  return (
    <Seeded lookup={exampleLookup}>
      <LetterWrite campaignSlug={letterToPm.slug} />
    </Seeded>
  );
}

/** The bill's letter to an MP who signed ControlAI's letter: a note above it. */
export function LetterWriteSignedExample() {
  return (
    <Seeded lookup={{ ...exampleLookup, campaign: bill.slug, statuses: { [CONTROLAI_LETTER_ASK]: "signed" } }}>
      <LetterWrite campaignSlug={bill.slug} />
    </Seeded>
  );
}

/** The widget, stood in for, handing over its token. */
export function TurnstileExample() {
  return (
    <WithFakeTurnstile>
      <Logged>{(log) => <Turnstile siteKey="fixture" onToken={log("onToken")} />}</Logged>
    </WithFakeTurnstile>
  );
}
