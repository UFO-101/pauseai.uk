"use client";

import { useState } from "react";
import { ButtonInside } from "@/components/ui/Button";
import { useLeaving } from "@/components/ui/useLeaving";
import { navigate } from "@/lib/navigate";
import styles from "./DonateForm.module.css";

type Frequency = "monthly" | "oneoff";

export const ONE_OFF_URL = "https://donate.stripe.com/14AaEY7J69wKgTAaSlcbC02";
// The single source of truth for the monthly tiers: the amount buttons are
// derived from these keys below, so a preset can't appear in the UI without a
// payment link behind it.
export const MONTHLY_URLS: Record<number, string> = {
  3: "https://donate.stripe.com/3cI3cwgfCgZc46O4tXcbC03",
  5: "https://donate.stripe.com/3cIdRa7J610ebzg4tXcbC00",
  10: "https://donate.stripe.com/cNi3cwd3q24i5aS1hLcbC01",
  25: "https://donate.stripe.com/14AcN61kI7oCbzgaSlcbC04",
  50: "https://donate.stripe.com/7sYeVebZmcIW8n41hLcbC05",
  100: "https://donate.stripe.com/9B6bJ2d3qeR446O9OhcbC06",
  250: "https://donate.stripe.com/dRmfZi1kIfV8bzg2lPcbC07",
  500: "https://donate.stripe.com/cNi28s5AY5gucDkbWpcbC08",
};
const AMOUNTS = Object.keys(MONTHLY_URLS)
  .map(Number)
  .sort((a, b) => a - b);
// The preset selected to begin with. DonateForm.browser.test.tsx checks it is one of the tiers above.
export const DEFAULT_AMOUNT = 5;

export default function DonateForm() {
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [selectedAmount, setSelectedAmount] = useState<number>(DEFAULT_AMOUNT);
  // From the button's press until Stripe's page comes.
  const [leaving, leave] = useLeaving();
  const isMonthly = frequency === "monthly";
  const ctaLabel = isMonthly ? `Donate £${selectedAmount} a month` : "Donate one-off →";

  function handleFreqClick(freq: Frequency) {
    if (freq === frequency) return;
    setFrequency(freq);
    if (freq === "monthly") {
      setSelectedAmount(DEFAULT_AMOUNT);
    }
  }

  function handleAmountClick(val: number) {
    setSelectedAmount(val);
  }

  // Deliberately a programmatic navigation from a <button>, never an
  // <a href> to Stripe: GA4 enhanced measurement auto-tracks clicks on
  // outbound anchor elements, and we don't want Google Analytics to see
  // who clicks through to donate. Page views on /donate are fine.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    leave();
    // Every selectable amount is a key of MONTHLY_URLS, so there is always a link.
    navigate(isMonthly ? MONTHLY_URLS[selectedAmount] : ONE_OFF_URL);
  }

  return (
    <form className={styles.form} id="donate-form" onSubmit={handleSubmit} noValidate>
      <div className={styles.toggle} role="radiogroup" aria-label="How you'd like to give">
        <button
          type="button"
          role="radio"
          aria-checked={frequency === "monthly"}
          data-freq="monthly"
          className={frequency === "monthly" ? `${styles.option} ${styles.active}` : styles.option}
          onClick={() => handleFreqClick("monthly")}
        >
          <span className={styles.name}>Monthly</span>
          <span className={styles.method}>Direct Debit</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={frequency === "oneoff"}
          data-freq="oneoff"
          className={frequency === "oneoff" ? `${styles.option} ${styles.active}` : styles.option}
          onClick={() => handleFreqClick("oneoff")}
        >
          <span className={styles.name}>One-off</span>
          <span className={styles.method}>Card · Apple Pay · Google Pay</span>
        </button>
      </div>

      {isMonthly && (
        <fieldset className={styles.amounts}>
          <legend>Choose an amount</legend>
          <div className={styles.amountGrid}>
            {AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                aria-pressed={selectedAmount === val}
                className={selectedAmount === val ? `${styles.amount} ${styles.active}` : styles.amount}
                onClick={() => handleAmountClick(val)}
              >
                £{val}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <button type="submit" className={styles.submit} disabled={leaving} aria-busy={leaving || undefined}>
        <ButtonInside pending={leaving}>
          <span>{ctaLabel}</span>
        </ButtonInside>
      </button>

      <p className={styles.footnote}>
        Payments are processed securely by{" "}
        <a href="https://stripe.com/en-gb/privacy" target="_blank" rel="noreferrer">
          Stripe
        </a>
        .
      </p>
    </form>
  );
}
