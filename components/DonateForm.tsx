"use client";

import { useState } from "react";

type Frequency = "monthly" | "oneoff";
type PaymentMethod = "bacs_debit" | "card";

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bacs_debit");
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const amount = isCustom ? (parseInt(customAmount, 10) || null) : selectedAmount;
  const isMonthly = frequency === "monthly";

  const ctaLabel = isMonthly
    ? amount && amount >= MIN_AMOUNT
      ? `Donate £${amount} a month`
      : "Donate £…"
    : "Donate one-off →";

  function handleFreqClick(freq: Frequency, method: PaymentMethod) {
    if (freq === frequency) return;
    setFrequency(freq);
    setPaymentMethod(method);
  }

  function handleAmountClick(val: number | "other") {
    if (val === "other") {
      setIsCustom(true);
      setSelectedAmount(0);
    } else {
      setIsCustom(false);
      setSelectedAmount(val);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (frequency === "oneoff") {
      window.location.href = ONE_OFF_URL;
      return;
    }
    if (!amount || !isFinite(amount) || amount < MIN_AMOUNT) {
      alert(`Please enter an amount of £${MIN_AMOUNT} or more.`);
      return;
    }
    const url = MONTHLY_URLS[amount];
    if (!url) {
      alert(`No payment link for £${amount}/month. Please choose a preset amount.`);
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
          onClick={() => handleFreqClick("monthly", "bacs_debit")}
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
          onClick={() => handleFreqClick("oneoff", "card")}
        >
          <span className="freq-name">One-off</span>
          <span className="freq-method">Card · Apple Pay · Google Pay</span>
        </button>
      </div>

      <fieldset className="amount-selector">
        <legend>Choose an amount</legend>
        <div className="amount-grid">
          {AMOUNTS.map((val) => (
            <button
              key={val}
              type="button"
              className={`amount-option${!isCustom && selectedAmount === val ? " is-active" : ""}`}
              onClick={() => handleAmountClick(val)}
            >
              £{val}
            </button>
          ))}
          <button
            type="button"
            className={`amount-option amount-other${isCustom ? " is-active" : ""}`}
            onClick={() => handleAmountClick("other")}
          >
            Other
          </button>
        </div>
        {isCustom && (
          <div className="amount-custom">
            <label htmlFor="custom-amount">Enter amount</label>
            <div className="amount-input-wrap">
              <span className="currency-prefix">£</span>
              <input
                type="number"
                id="custom-amount"
                name="custom-amount"
                min={3}
                step={1}
                inputMode="numeric"
                placeholder="3 or more"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                autoFocus
              />
              <span className="amount-suffix">{isMonthly ? "per month" : "one-off"}</span>
            </div>
            <p className="amount-help">Minimum £3 per month.</p>
          </div>
        )}
      </fieldset>

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
