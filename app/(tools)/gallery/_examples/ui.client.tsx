"use client";

// The ui kit's examples that need state or callbacks: client components with
// no props, so the server-rendered gallery can place them.
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import Lightbox from "@/components/ui/Lightbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Logged } from "../_components/wiring";

const PHOTOS = ["/images/fundraising/brussels-panel-thumb.jpg", "/images/fundraising/brussels-discussion-thumb.jpg"];

/**
 * The lightbox, behind a button: it covers the whole page, so it starts shut.
 * Open, next and previous step through two photos; close hides it.
 */
export function LightboxExample() {
  const [shown, setShown] = useState<number | null>(null);
  return (
    <Logged>
      {(log) => (
        <>
          <Button variant="ghost" size="small" fit onClick={() => setShown(0)}>
            Open the lightbox
          </Button>
          <Lightbox
            open={shown !== null}
            label="A photo"
            onClose={() => {
              log("onClose")();
              setShown(null);
            }}
            onPrevious={() => {
              log("onPrevious")();
              setShown((i) => (i! + PHOTOS.length - 1) % PHOTOS.length);
            }}
            onNext={() => {
              log("onNext")();
              setShown((i) => (i! + 1) % PHOTOS.length);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- as the gallery's lightbox does */}
            <img src={PHOTOS[shown ?? 0]} alt="An example photo" style={{ maxWidth: "100%" }} />
          </Lightbox>
        </>
      )}
    </Logged>
  );
}

/** A form's submit button: pending while its action runs, which here takes a second. */
export function SubmitButtonExample() {
  return (
    <form
      action={async () => {
        await new Promise((done) => setTimeout(done, 1000));
      }}
    >
      <SubmitButton variant="primary">Import</SubmitButton>
    </form>
  );
}
