// PauseAI UK — donate page
//
// Handles the interactive bits of the donation form:
//   - Frequency + payment method picker (Monthly · DD / One-off · Card)
//   - Suggested-amount selection (presets only for Monthly; "Other" shown for One-off)
//   - "Other" -> custom amount input (One-off only — Stripe sets the amount there)
//   - Dynamic CTA label ("Donate £5 a month" / "Donate £5")
//   - On submit: redirect to the matching Stripe Payment Link

(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────
  // Stripe Payment Links. The one-off link is "customer chooses price" —
  // the donor confirms the amount on Stripe's secure page. The monthly
  // links are fixed-amount recurring, so each preset routes to its own.
  const ONE_OFF_URL = 'https://donate.stripe.com/14AaEY7J69wKgTAaSlcbC02';
  const MONTHLY_URLS = {
    3:   'https://donate.stripe.com/3cI3cwgfCgZc46O4tXcbC03',
    5:   'https://donate.stripe.com/3cIdRa7J610ebzg4tXcbC00',
    10:  'https://donate.stripe.com/cNi3cwd3q24i5aS1hLcbC01',
    25:  'https://donate.stripe.com/14AcN61kI7oCbzgaSlcbC04',
    50:  'https://donate.stripe.com/7sYeVebZmcIW8n41hLcbC05',
    100: 'https://donate.stripe.com/9B6bJ2d3qeR446O9OhcbC06',
    250: 'https://donate.stripe.com/dRmfZi1kIfV8bzg2lPcbC07',
    500: 'https://donate.stripe.com/cNi28s5AY5gucDkbWpcbC08',
  };
  const MIN_AMOUNT = 3; // pounds

  // ── State ──────────────────────────────────────────────
  const state = {
    frequency: 'monthly',        // 'monthly' | 'oneoff'
    paymentMethod: 'bacs_debit', // 'bacs_debit' | 'card'
    amount: 5,                   // pounds; null when "other" is picked with no value
    isCustom: false,
  };

  // ── Elements ───────────────────────────────────────────
  const form = document.getElementById('donate-form');
  if (!form) return;

  const freqOptions = form.querySelectorAll('.freq-option');
  const amountOptions = form.querySelectorAll('.amount-option');
  const amountSelector = form.querySelector('.amount-selector');
  const otherBtn = form.querySelector('.amount-other');
  const customWrap = form.querySelector('.amount-custom');
  const customInput = form.querySelector('#custom-amount');
  const submitBtn = form.querySelector('#donate-submit');
  const ctaLabel = form.querySelector('#donate-cta-label');
  const customSuffix = form.querySelector('.amount-input-wrap [data-freq-suffix]');

  // ── Helpers ────────────────────────────────────────────
  function updateCtaLabel() {
    if (!ctaLabel) return;
    if (state.frequency === 'oneoff') {
      ctaLabel.textContent = 'Donate one-off →';
    } else {
      const amountText = state.amount && state.amount >= MIN_AMOUNT
        ? '£' + state.amount
        : '£…';
      ctaLabel.textContent = 'Donate ' + amountText + ' a month';
    }
    if (customSuffix) {
      customSuffix.textContent = state.frequency === 'monthly' ? 'per month' : 'one-off';
    }
  }

  function setAmountSelectorVisible(visible) {
    if (amountSelector) amountSelector.hidden = !visible;
  }

  function setOtherVisible(visible) {
    if (otherBtn) otherBtn.hidden = !visible;
  }

  function activatePreset(amount) {
    const btn = form.querySelector('.amount-option[data-amount="' + amount + '"]');
    if (!btn) return;
    amountOptions.forEach((b) => b.classList.toggle('is-active', b === btn));
    state.amount = amount;
    state.isCustom = false;
    customWrap.hidden = true;
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
      // Monthly: show preset grid (no custom recurring), hide Other.
      // One-off: hide the grid entirely — the donor picks the amount on
      // Stripe's "customer chooses price" page.
      if (freq === 'monthly') {
        setAmountSelectorVisible(true);
        setOtherVisible(false);
        if (state.isCustom) activatePreset(5);
      } else {
        setAmountSelectorVisible(false);
      }
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

  // ── Submit → redirect to the matching Stripe Payment Link ─
  function validate() {
    // One-off: Stripe's "customer chooses price" page enforces the amount.
    if (state.frequency === 'oneoff') return null;
    if (!Number.isFinite(state.amount) || state.amount < MIN_AMOUNT) {
      return `Please enter an amount of £${MIN_AMOUNT} or more.`;
    }
    return null;
  }

  function targetUrl() {
    if (state.frequency === 'oneoff') return ONE_OFF_URL;
    return MONTHLY_URLS[state.amount] || null;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const err = validate();
    if (err) {
      alert(err);
      if (state.isCustom) customInput.focus();
      return;
    }
    const url = targetUrl();
    if (!url) {
      alert('Sorry — that amount is not available right now. Please pick a preset or email hello@pauseai.uk.');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Redirecting…';
    window.location.href = url;
  });

  // Initial render — default is Monthly: show preset grid, hide Other.
  setAmountSelectorVisible(true);
  setOtherVisible(false);
  updateCtaLabel();
})();
