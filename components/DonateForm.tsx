"use client";

import { useState } from "react";

type Frequency = "monthly" | "oneoff";
type PaymentMethod = "bacs_debit" | "card";

const CHECKOUT_ENDPOINT = "/api/create-checkout-session";
const MIN_AMOUNT = 3;

const AMOUNTS = [3, 5, 10, 25, 50, 100];

export default function DonateForm() {
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bacs_debit");
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amount = isCustom ? (parseInt(customAmount, 10) || null) : selectedAmount;
  const isMonthly = frequency === "monthly";

  const ctaLabel =
    amount && amount >= MIN_AMOUNT
      ? `Donate £${amount}${isMonthly ? " a month" : ""}`
      : "Donate £…";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !isFinite(amount) || amount < MIN_AMOUNT) {
      alert(`Please enter an amount of £${MIN_AMOUNT} or more.`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        amount_pounds: amount,
        frequency,
        payment_method: paymentMethod,
      };
      console.log("[donate] would POST to", CHECKOUT_ENDPOINT, payload);
      alert(
        `Stripe is not wired up yet. This would create a ${frequency} £${amount} donation via ${paymentMethod === "bacs_debit" ? "Direct Debit" : "card / wallet"}.`
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again or email joseph@pauseai.info.");
    } finally {
      setSubmitting(false);
    }
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
        disabled={submitting}
      >
        <span>{submitting ? "Redirecting…" : ctaLabel}</span>
      </button>

      <p className="form-footnote">
        Payments are processed securely by{" "}
        <a href="https://stripe.com/en-gb/privacy" target="_blank" rel="noreferrer">Stripe</a>.
      </p>
    </form>
  );
}
