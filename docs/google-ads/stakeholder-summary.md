# Google Ads tracking on pauseai.uk: what we're doing and what we need

## Summary

We are adding conversion tracking so Google Ads can tell which ads lead to real actions (signups, emails to MPs, donations). Without it, Ads can only optimise for clicks, which usually means paying for people who never do anything. Both primary actions (signups and emails to MPs) are built. Donations are tracked as a secondary goal via visits to the donate page only, with no click tracking.

## What has been done

- **Google Tag Manager (GTM) is installed on pauseai.uk.** GTM is a single container on the site. Ads tags are configured in its web UI, so future changes don't need a developer or a redeploy.
- **It respects cookie consent.** GTM loads only for visitors who haven't declined analytics, using the same consent logic the site already has for Google Analytics.
- **Signups** are tracked when someone completes the onboarding form. The form lives on pauseai.info, so that site now sends pauseai.uk a "signup complete" signal (pull request in progress, no personal data is sent).
- **Emails to MPs** will be tracked the same way. The request for the pauseai.info side is written; the pauseai.uk side is done.

## Proposed conversions

| Goal | Role in Ads | Status |
|---|---|---|
| Onboarding signup | Primary (Ads bids on this) | Built, awaiting pauseai.info deploy |
| Email your MP | Primary | pauseai.uk side built, pauseai.info side requested |
| Visit the donate page | Secondary (reporting and audiences only) | No code needed, page view trigger in GTM |
| Join WhatsApp, view Luma events, shop | Secondary | No code needed, configured in GTM |

## Donations: decision made

Donations go to Stripe, a different website, so pauseai.uk can't see whether one completed. The donate page also has a deliberate rule that we don't let Google see who clicks through to donate. **Decision: no donation click tracking.** We count visits to the `/donate` page as a secondary conversion instead.

- What this gives us: Ads can report how many ad clicks reached the donate page, and can build an audience of donate-page visitors.
- What it doesn't give us: Ads can't tell who actually donated, so it can't bid for donors specifically.
- Can be revisited later: if we want completed-donation tracking, the option is to send donors back to a thank-you page on pauseai.uk after Stripe, without tracking the click-through.

## What we need from you

1. Confirmation that using visitor data for advertising conversions is consistent with our privacy policy. The site's cookie text currently describes analytics cookies only, and it may need a line about advertising.
2. Access for the person setting up Ads: a Google Ads conversion ID and label per conversion action (or edit access so we can create them).

## Rough timeline

- Code and GTM setup: about half a day once the pauseai.info changes are deployed.
- Conversions need a few days of live data before Ads bidding can use them.

## Signup form is also tracked by pauseai.info

The onboarding form is embedded from pauseai.info, and that site loads its own Google Tag Manager container (`GTM-MZS328RW`) inside the form. Other sites also embed this form, so it will keep loading whatever a visitor chooses on pauseai.uk. Consequences:

- **Consent:** our cookie banner doesn't cover it. A visitor who declines on pauseai.uk is still tracked inside the form by pauseai.info's container. Our privacy policy currently says nothing about this or about advertising, so someone should decide whether it needs a line (for example: embedded forms from pauseai.info may set their own cookies, and this site's Ads measurement).
- **Double counting:** if pauseai.info's container also fires a conversion on signup, Ads could count one signup twice. We avoid this by keeping the signup conversion action in one place (our container), and by checking what pauseai.info's container fires. The pauseai.info side can't attribute to a pauseai.uk ad click anyway, since it runs in a third-party frame without our ad-click information.
- An investigation request has been written for the pauseai.info side to find out what is in that container.

## Risks

- Conversion numbers will slightly undercount, as visitors who decline cookies aren't tracked. That is the intended behaviour.
- Google Analytics is already on the site. If GTM also sends GA events we could double count pageviews, so we'll keep to one.
