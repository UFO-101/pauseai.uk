# Wall of thanks on /donate

Plan, 26 Oct 2026. Built 26 Oct 2026, with placeholder copy; names are shown untidied until question 2 is settled.

## What we're making

At checkout, Stripe asks every donor "Are you happy to be named on our wall of thanks?". The donate page shows the latest of those who said yes, under the donate button.

The design is number 3, "Latest names beside the form", in https://claude.ai/artifact/7th2RQBZZ41qm72UH96czm: a box under the form listing the five most recent names, each with the month they gave, and a line saying how many people are named in all. On a phone it comes straight after the form. The other designs there were considered and not chosen.

## What's in Stripe (checked 26 Oct 2026)

- All nine donate links (`ONE_OFF_URL` and `MONTHLY_URLS` in `DonateForm.tsx`) ask the question. It's a required dropdown with the key `areyouhappytobenamedonourwallofthanks` and the values `yes` and `no`.
- 48 completed checkouts since 2 June 2026. 26 said yes, 20 said no, and 2, from 4 June, were before the question was added.
- The 26 yeses come from 22 people. Nobody has said yes once and no another time.
- Every yes has a name. 16 of the 22 are written normally ("Jane Smith"). Of the other six, 2 are all lower case, 1 is partly lower case, 1 is all capitals with initials (a bank account name, from Direct Debit), 1 has the surname in capitals, and 1 is a first name only.

The name is `customer_details.name` on the Checkout Session, and the answer is in its `custom_fields`. One request, `GET /v1/checkout/sessions?status=complete&limit=100`, returns all of them for now; past 100 it pages with `starting_after` ([list Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/list)).

## The Stripe key

`STRIPE_WALL_OF_THANKS_KEY`, a restricted live key used for nothing else ([restricted keys](https://docs.stripe.com/keys/restricted-api-keys)). The wall needs only **Checkout Sessions: Read**.

The key in `tmp/env` can read Checkout Sessions, Payment Links and Payment Intents, and can't read Subscriptions, Customers or Charges. Before it goes into Netlify, take off Payment Links (only needed for the check above) and Payment Intents (not needed at all).

## How it works

- **The page reads Stripe directly**, cached for an hour, as the events pages read Luma (`getEvents` in `lib/server/outside-services/luma-calendar.ts`). No table, no import, no staff page.
- It keeps the completed sessions that answered `yes`, takes one name per email address (the latest), and sorts them newest first. The page shows the first five, each with the month of that checkout, and the total count. If Stripe fails, the box isn't shown, and the rest of the page is unchanged.
- Names are shown exactly as the donor gave them.
- To take someone off the wall, staff change their answer to No in the Stripe Dashboard. Stripe lets you edit custom field answers there ([custom fields](https://docs.stripe.com/payments/checkout/custom-components?ui=full-page#retrieve-custom-fields)). The name is gone within the hour, and the next name moves up.
- Monthly donors stay on the wall after they cancel. Checking would need Subscriptions: Read.
- Dev, the tests and the storyboard use fixture checkouts (`tests/fixtures/outside-services.ts`), never Stripe.
- Headings and other words are placeholders until someone writes them.

## Data protection

Naming someone as a PauseAI UK donor reveals their political opinion, which is special category data (`docs/data-protection.md`, "Political opinions"). Our usual condition, Article 9(2)(d), doesn't allow sharing outside PauseAI UK without consent. So the wall rests on the checkout question as explicit consent (Article 9(2)(a)).

In the same pull request:

- `docs/data-protection.md`: a row for the wall (name, email and date from Stripe, explicit consent, cached for an hour, nothing kept in our database). Correct the "Donations" row, which says we keep a record here; we don't. Add Stripe to "Processors". In "Erasure and access", add the step of changing the answer to No in Stripe.
- The privacy policy, "Donation data": say that donors who say yes are named on the donate page with the month they gave, and how to be taken off. Someone writes the words.

## Steps

1. Read Stripe, with fixtures and tests.
2. The box beside the form: its gallery example, a storyboard flow, and a line in `docs/testing.md`.
3. The data protection record and the privacy policy, in the same pull request.

## Questions

1. The box shows the month each person gave, which the question didn't mention. Is that covered by their yes, or should it show names only?
2. Should we tidy names that are all lower case or all capitals, or show them as given? Tidying gets names like "McDonald" wrong. The alternative is to fix them by hand in Stripe, though I don't know if the Dashboard lets you edit a customer's name on a completed checkout.
