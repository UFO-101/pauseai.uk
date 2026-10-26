# Wall of thanks on /donate

Plan, 26 Oct 2026. Built 26 Oct 2026.

## What we're making

At checkout, Stripe asks every donor "Are you happy to be named on our wall of thanks?". The donate page shows the latest of those who said yes, under the donate button.

The design is number 3, "Latest names beside the form", in https://claude.ai/artifact/7th2RQBZZ41qm72UH96czm: a box under the form listing every name, newest first, each with the date they gave. It's five rows tall, and once there are more names it rolls slowly upwards by itself to the oldest name, then stops; people can scroll it too. On a phone it comes straight after the form. The other designs there were considered and not chosen.

## What's in Stripe (checked 26 Oct 2026)

- All nine donate links (`ONE_OFF_URL` and `MONTHLY_URLS` in `DonateForm.tsx`) ask the question. It's a required dropdown with the key `areyouhappytobenamedonourwallofthanks` and the values `yes` and `no`.
- 48 completed checkouts since 2 June 2026. 26 said yes, 20 said no, and 2, from 4 June, were before the question was added.
- The 26 yeses come from 22 people. Nobody has said yes once and no another time.
- Every yes has a name. 16 of the 22 are written normally ("Jane Smith"). Of the other six, 2 are all lower case, 1 is partly lower case, 1 is all capitals with initials (a bank account name, from Direct Debit), 1 has the surname in capitals, and 1 is a first name only.

The name is `customer_details.name` on the Checkout Session, and the answer is in its `custom_fields`. One request, `GET /v1/checkout/sessions?status=complete&limit=100`, returns all of them for now; past 100 it pages with `starting_after` ([list Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/list)).

A monthly gift's later payments aren't checkouts. They're Payment Intents ([list PaymentIntents](https://docs.stripe.com/api/payment_intents/list)): 88 on 26 Oct 2026, with the `customer` that the gift's checkout made, and `payment_details.order_reference` set to the invoice's `in_` ID. Tickets (buses to the march, a debate) are Payment Intents too, with no order reference, so they don't count. 5 of the 9 monthly donors who said yes have paid since their checkout.

## The Stripe key

`STRIPE_WALL_OF_THANKS_KEY`, a restricted live key used for nothing else ([restricted keys](https://docs.stripe.com/keys/restricted-api-keys)). The wall needs **Checkout Sessions: Read** and **Payment Intents: Read**.

The key in `tmp/env` can read Checkout Sessions, Payment Links and Payment Intents, and can't read Subscriptions, Customers or Charges. Before it goes into Netlify, take off Payment Links (only needed for the check above).

## How it works

- **The page reads Stripe directly**, cached for an hour, as the events pages read Luma (`getEvents` in `lib/server/outside-services/luma-calendar.ts`). No table, no import, no staff page.
- It keeps the completed sessions that answered `yes`, takes one name per email address (the latest), and sorts them newest first. Each donor's date is their latest gift: their latest checkout, or a later successful monthly payment by a customer one of their own checkouts made. So payments only count for donors who said yes. The page shows them all, newest gift first. If Stripe fails, the box isn't shown, and the rest of the page is unchanged.
- Names are shown exactly as the donor gave them, not tidied: changing capitals in code gets names like "McDonald" wrong.
- To take someone off the wall, staff change their answer to No in the Stripe Dashboard. Stripe lets you edit custom field answers there ([custom fields](https://docs.stripe.com/payments/checkout/custom-components?ui=full-page#retrieve-custom-fields)). The name is gone within the hour, and the next name moves up.
- Monthly donors stay on the wall after they cancel, but sink down it as others give.
- Dev, the tests and the storyboard use fixture checkouts and payments (`tests/fixtures/outside-services.ts`), never Stripe.
- Headings and other words are placeholders until someone writes them.

## Data protection

Naming someone as a PauseAI UK donor reveals their political opinion, which is special category data (`docs/data-protection.md`, "Political opinions"). Our usual condition, Article 9(2)(d), doesn't allow sharing outside PauseAI UK without consent. So the wall rests on the checkout question as explicit consent (Article 9(2)(a)).

In the same pull request:

- `docs/data-protection.md`: a row for the wall (name, email and date from Stripe, explicit consent, cached for an hour, nothing kept in our database). Correct the "Donations" row, which says we keep a record here; we don't. Add Stripe to "Processors". In "Erasure and access", add the step of changing the answer to No in Stripe.
- The privacy policy, "Donation data": say that donors who say yes are named on the donate page with the date they gave, and how to be taken off. Someone writes the words.

## Steps

1. Read Stripe, with fixtures and tests.
2. The box beside the form: its gallery example, a storyboard flow, and a line in `docs/testing.md`.
3. The data protection record and the privacy policy, in the same pull request.

## Questions

1. The box shows the date each person last gave, which the question didn't mention. For monthly donors that shows they're still giving. Is that covered by their yes, or should it show names only?
