"use client";

import { useState } from "react";

type Frequency = "monthly" | "oneoff";

const ONE_OFF_URL = "https://donate.stripe.com/14AaEY7J69wKgTAaSlcbC02";
const MONTHLY_URLS: Record<number, string> = {
  3:   "https://donate.stripe.com/3cI3cwgfCgZc46O4tXcbC03",
  5:   "https://donate.stripe.com/3cIdRa7J610ebzg4tXcbC00",
  10:  "https://donate.stripe.com/cNi3cwd3q24i5aS1hLcbC01",
  25:  "https://donate.stripe.com/14AcN61kI7oCbzgaSlcbC04",
  50:  "https://donate.stripe.com/7sYeVebZmcIW8n41hLcbC05",
  100: "https://donate.stripe.com/9B6bJ2d3qeR446O9OhcbC06",
  250: "https://donate.stripe.com/dRmfZi1kIfV8bzg2lPcbC07",
  500: "https://donate.stripe.com/cNi28s5AY5gucDkbWpcbC08",
};
const MIN_AMOUNT = 3;

const AMOUNTS = [3, 5, 10, 25, 50, 100, 250, 500];

export default function DonateForm() {
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const isMonthly = frequency === "monthly";
  const amount = selectedAmount;

  const ctaLabel = isMonthly
    ? amount && amount >= MIN_AMOUNT
      ? `Donate £${amount} a month`
      : "Donate £…"
    : "Donate one-off →";

  function handleFreqClick(freq: Frequency) {
    if (freq === frequency) return;
    setFrequency(freq);
    if (freq === "monthly") {
      setSelectedAmount(5);
    }
  }

  function handleAmountClick(val: number) {
    setSelectedAmount(val);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (frequency === "oneoff") {
      window.location.href = ONE_OFF_URL;
      return;
    }
    const url = MONTHLY_URLS[amount];
    if (!url) {
      alert("Sorry — that amount is not available. Please pick a preset or email hello@pauseai.uk.");
      return;
    }
    window.location.href = url;
  }

  return (
    <form className="donate-form" id="donate-form" onSubmit={handleSubmit} noValidate>
      <div className="freq-toggle" role="radiogroup" aria-label="How you'd like to give">
        <button
          type="button"
          role="radio"
          aria-checked={frequency === "monthly"}
          data-freq="monthly"
          className={`freq-option${frequency === "monthly" ? " is-active" : ""}`}
          onClick={() => handleFreqClick("monthly")}
        >
          <span className="freq-name">Monthly</span>
          <span className="freq-method">Direct Debit</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={frequency === "oneoff"}
          data-freq="oneoff"
          className={`freq-option${frequency === "oneoff" ? " is-active" : ""}`}
          onClick={() => handleFreqClick("oneoff")}
        >
          <span className="freq-name">One-off</span>
          <span className="freq-method">Card · Apple Pay · Google Pay</span>
        </button>
      </div>

      {isMonthly && (
        <fieldset className="amount-selector">
          <legend>Choose an amount</legend>
          <div className="amount-grid">
            {AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                className={`amount-option${selectedAmount === val ? " is-active" : ""}`}
                onClick={() => handleAmountClick(val)}
              >
                £{val}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <button
        type="submit"
        className="btn primary large donate-btn"
      >
        <span>{ctaLabel}</span>
      </button>

      <p className="form-footnote">
        Payments are processed securely by{" "}
        <a href="https://stripe.com/en-gb/privacy" target="_blank" rel="noreferrer">Stripe</a>.
      </p>
    </form>
  );
}
