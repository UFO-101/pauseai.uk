// PauseAI UK — donate page
//
// Handles the interactive bits of the donation form:
//   - Frequency + payment method picker (Monthly · DD / One-off · Card)
//   - Suggested-amount selection
//   - "Other" -> custom amount input
//   - Dynamic CTA label ("Donate £5 a month" / "Donate £5")
//   - On submit: POST to the Cloudflare Worker that creates a Stripe
//     Checkout Session and redirects the donor there.
//
// The Stripe call itself is STUBBED below until the Worker is deployed
// and the Stripe account exists. Search for TODO(stripe).

(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────
  // TODO(stripe): replace with the deployed Cloudflare Worker URL once we
  // have it (e.g. https://donate-api.pauseai-uk.workers.dev/checkout).
  const CHECKOUT_ENDPOINT = '/api/create-checkout-session';
  const MIN_AMOUNT = 3; // pounds

  // ── State ──────────────────────────────────────────────
  const state = {
    frequency: 'monthly',      // 'monthly' | 'oneoff'
    paymentMethod: 'bacs_debit', // 'bacs_debit' | 'card'
    amount: 5,                  // pounds; null when "other" is picked with no value
    isCustom: false,
  };

  // ── Elements ───────────────────────────────────────────
  const form = document.getElementById('donate-form');
  if (!form) return;

  const freqOptions = form.querySelectorAll('.freq-option');
  const amountOptions = form.querySelectorAll('.amount-option');
  const customWrap = form.querySelector('.amount-custom');
  const customInput = form.querySelector('#custom-amount');
  const submitBtn = form.querySelector('#donate-submit');
  const ctaLabel = form.querySelector('#donate-cta-label');
  const customSuffix = form.querySelector('.amount-input-wrap [data-freq-suffix]');

  // ── UI updates ─────────────────────────────────────────
  function updateCtaLabel() {
    const amountText = state.amount && state.amount >= MIN_AMOUNT
      ? '£' + state.amount
      : '£…';
    const tail = state.frequency === 'monthly' ? ' a month' : '';
    if (ctaLabel) ctaLabel.textContent = 'Donate ' + amountText + tail;
    if (customSuffix) {
      customSuffix.textContent = state.frequency === 'monthly' ? 'per month' : 'one-off';
    }
  }

  // ── Frequency / method tabs ────────────────────────────
  freqOptions.forEach((btn) => {
    btn.addEventListener('click', () => {
      const freq = btn.dataset.freq;
      const method = btn.dataset.method;
      if (freq === state.frequency) return;
      state.frequency = freq;
      state.paymentMethod = method;
      freqOptions.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-checked', active ? 'true' : 'false');
      });
      updateCtaLabel();
    });
  });

  // ── Amount selection ───────────────────────────────────
  amountOptions.forEach((btn) => {
    btn.addEventListener('click', () => {
      amountOptions.forEach((b) => b.classList.toggle('is-active', b === btn));
      const val = btn.dataset.amount;
      if (val === 'other') {
        state.isCustom = true;
        state.amount = null;
        customWrap.hidden = false;
        customInput.focus();
      } else {
        state.isCustom = false;
        state.amount = parseInt(val, 10);
        customWrap.hidden = true;
      }
      updateCtaLabel();
    });
  });

  customInput.addEventListener('input', () => {
    const v = parseInt(customInput.value, 10);
    state.amount = Number.isFinite(v) ? v : null;
    updateCtaLabel();
  });

  // ── Submit ─────────────────────────────────────────────
  function validate() {
    if (!Number.isFinite(state.amount) || state.amount < MIN_AMOUNT) {
      return `Please enter an amount of £${MIN_AMOUNT} or more.`;
    }
    return null;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const err = validate();
    if (err) {
      alert(err);
      if (state.isCustom) customInput.focus();
      return;
    }

    submitBtn.disabled = true;
    const previousLabel = submitBtn.innerHTML;
    submitBtn.textContent = 'Redirecting…';

    try {
      // TODO(stripe): once the Cloudflare Worker is live, this fetch will
      // create a Checkout Session server-side and return { url } that we
      // redirect the donor to. Until then we just log what would be sent.
      const payload = {
        amount_pounds: state.amount,
        frequency: state.frequency,        // 'monthly' | 'oneoff'
        payment_method: state.paymentMethod, // 'bacs_debit' | 'card'
      };
      console.log('[donate] would POST to', CHECKOUT_ENDPOINT, payload);
      alert(
        'Stripe is not wired up yet. This would create a ' +
          state.frequency +
          ' £' +
          state.amount +
          ' donation via ' +
          (state.paymentMethod === 'bacs_debit' ? 'Direct Debit' : 'card / wallet') +
          '.'
      );

      // Real implementation (commented until Worker is deployed):
      //
      // const res = await fetch(CHECKOUT_ENDPOINT, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      // if (!res.ok) throw new Error('Checkout session failed');
      // const { url } = await res.json();
      // window.location.href = url;
    } catch (e) {
      console.error(e);
      alert('Something went wrong. Please try again or email joseph@pauseai.info.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = previousLabel;
    }
  });

  // Initial render
  updateCtaLabel();
})();
