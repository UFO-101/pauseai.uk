# Links to the march sign-up

Every tracked link to the march sign-up at pauseai.uk/march has one tag,
utm_source, a short code saying where the link came from, and nothing else.
Google Analytics counts visits, and registrations, by it; this page is the
key. The sign-up also sends the tags a visitor arrived with along with their
registration (`app/(march)/march/_components/arrival-tags.ts`), for storing
alongside it.

With only a source, GA puts these visits in its Unassigned channel: find
them by Session source.

| utm_source | Whose links                                    |
| ---------- | ---------------------------------------------- |
| `sh`       | Shares from the share card, every app the same |
| `in`       | Influencer outreach                            |
| The rest   | PauseAI UK's own channels, below               |

The share link is `shareUrl` in `lib/content/march-signup.ts`. Which app a share went
to isn't in the link: the `march_share` event's `share_method` says (below).

## Our own channels

Use the link for the place the post goes. A new place gets a new two-letter
code, listed here, that isn't taken already.

| Where                                | utm_source | Link                                     |
| ------------------------------------ | ---------- | ---------------------------------------- |
| Newsletter                           | `nl`       | `https://pauseai.uk/march?utm_source=nl` |
| Email to local groups and volunteers | `ve`       | `https://pauseai.uk/march?utm_source=ve` |
| Email signatures                     | `es`       | `https://pauseai.uk/march?utm_source=es` |
| Instagram bio                        | `ib`       | `https://pauseai.uk/march?utm_source=ib` |
| Instagram story link sticker         | `is`       | `https://pauseai.uk/march?utm_source=is` |
| TikTok bio                           | `tt`       | `https://pauseai.uk/march?utm_source=tt` |
| X                                    | `tw`       | `https://pauseai.uk/march?utm_source=tw` |
| Bluesky                              | `bs`       | `https://pauseai.uk/march?utm_source=bs` |
| Facebook page                        | `fb`       | `https://pauseai.uk/march?utm_source=fb` |
| Threads                              | `th`       | `https://pauseai.uk/march?utm_source=th` |
| LinkedIn page                        | `li`       | `https://pauseai.uk/march?utm_source=li` |
| YouTube descriptions                 | `yt`       | `https://pauseai.uk/march?utm_source=yt` |
| WhatsApp and Signal community groups | `wa`       | `https://pauseai.uk/march?utm_source=wa` |
| Discord                              | `dc`       | `https://pauseai.uk/march?utm_source=dc` |
| Posters (the QR code)                | `po`       | `https://pauseai.uk/march?utm_source=po` |
| Flyers (the QR code)                 | `fl`       | `https://pauseai.uk/march?utm_source=fl` |
| The Luma event page                  | `lu`       | `https://pauseai.uk/march?utm_source=lu` |

Where the link has to be typed, as printed on a poster or said aloud, the
tag is lost: put the QR code on print, say "link in bio" in a caption, and
print plain pauseai.uk/march as the words. Links from pauseai.uk's own pages
to the sign-up have no tag: GA would start a new visit at them.

## Influencer outreach

Give influencers `https://pauseai.uk/march?utm_source=in`, one link for all
of them. Where it's said aloud or typed from a caption rather than clicked,
the tag is lost, and the visit counts as untagged.

## The sign-up's events

The sign-up pushes two events onto Google Tag Manager's dataLayer
(`app/(march)/march/_components/analytics.ts`), as the rest of the site does:

| Event          | When                                                                                     | Data                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `march_signup` | Someone registered: Luma took them                                                       | None                                                                                                                                  |
| `march_share`  | Someone shared: pressed an app, copied the message, or shared from a phone's share sheet | `share_method`: `whatsapp`, `telegram`, `x`, `bluesky`, `facebook`, `threads`, `linkedin`, `reddit`, `email`, `copy` or `share_sheet` |

They reach Google Analytics only through a tag in GTM (container
GTM-K7P36Q7F). To set it up:

1. Variables: a Data Layer Variable, its name `share_method`.
2. Triggers: a Custom Event trigger, its event name
   `march_signup|march_share`, "Use regex matching" ticked.
3. Tags: a "Google Analytics: GA4 Event" tag, measurement ID G-DLLRWZCYD7,
   event name `{{Event}}`, an event parameter `share_method` set to the
   variable, fired by that trigger. Publish the container.
4. In GA, Admin, Events: mark `march_signup` as a key event. Admin, Custom
   definitions: a custom dimension, event-scoped, for `share_method`.

## Seeing it in Google Analytics

- Registrations by where they came from: Explore, a free-form exploration,
  the event count of `march_signup` by Session source, read with the
  tables above.
- Visits: Reports, Acquisition, Traffic acquisition, by Session source.
- Shares by app: Reports, Engagement, Events, `march_share`, by the
  `share_method` dimension.
