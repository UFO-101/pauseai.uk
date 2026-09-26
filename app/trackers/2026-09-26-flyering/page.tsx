import type { Metadata } from "next";
import Nav from "@/components/Nav";
import NoAnalytics from "@/components/NoAnalytics";
import { getSourceCounts, lastPlace, leaders, ranks, type SourceCounts } from "@/lib/data/luma-sources";
import "../trackers.css";

// Volunteer tracker: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: "Flyering tracker, 26 September",
  robots: { index: false, follow: false },
};

// Each stall's QR code links to the event with ?utm_source=<tag>; Luma records it on every registration.
// The stalls recruit for the 5 December march, so that is the event we count.
const EVENT_API_ID = "evt-1HKCXSHaJqGO3Bg";
const EVENT_URL = "https://luma.com/pauseai-dec26";
// The stalls run 12:00–16:00 BST. Registrations outside that window (QR code test scans before, stragglers after) don't count.
const STALLS_OPEN = new Date("2026-09-26T12:00:00+01:00");
const STALLS_CLOSE = new Date("2026-09-26T16:00:00+01:00");
// Pages and Luma responses are cached for up to a minute, so wait a few minutes after close before naming a winner,
// or a late registration could still flip the result after it was announced.
const RESULT_AT = new Date(STALLS_CLOSE.getTime() + 5 * 60 * 1000);
const STALLS = [
  { tag: "stratford", name: "Stratford" },
  { tag: "angel", name: "Angel" },
  { tag: "bakerstreet", name: "Baker Street" },
  { tag: "brixton", name: "Brixton" },
  { tag: "waterloo", name: "Waterloo" },
  { tag: "londonbridge", name: "London Bridge" },
] as const;

const MEDALS = [
  { emoji: "🥇", label: "gold medal" },
  { emoji: "🥈", label: "silver medal" },
  { emoji: "🥉", label: "bronze medal" },
];

// One row per stall, busiest in the race first. Each bar is the race count with the afterwards count stacked on the end, on one shared scale.
// Medals and the wooden spoon belong to the race alone.
function StallList({ during, after, spoons }: { during: SourceCounts["counts"]; after: SourceCounts["counts"] | null; spoons: string[] }) {
  const order = [...STALLS].sort((a, b) => during[b.tag] - during[a.tag]);
  const rankOf = ranks(during);
  const later = (tag: string) => after?.[tag] ?? 0;
  const longest = Math.max(...STALLS.map((stall) => during[stall.tag] + later(stall.tag)));
  const percent = (n: number) => `${longest ? (n / longest) * 100 : 0}%`;
  return (
    <ol className="tracker-list">
      {order.map((stall) => {
        const rank = rankOf[stall.tag];
        const medal = rank ? MEDALS[rank - 1] : undefined;
        return (
          <li key={stall.tag} className="tracker-row">
            <span className="tracker-name">
              {stall.name}
              {medal && (
                <span role="img" aria-label={medal.label}>
                  {" "}
                  {medal.emoji}
                </span>
              )}
              {spoons.includes(stall.tag) && (
                <span role="img" aria-label="wooden spoon">
                  {" "}
                  🥄
                </span>
              )}
            </span>
            <span
              className="tracker-bar tracker-bar-after"
              aria-hidden="true"
              style={{ width: percent(during[stall.tag] + later(stall.tag)) }}
            />
            <span className="tracker-bar tracker-bar-during" aria-hidden="true" style={{ width: percent(during[stall.tag]) }} />
            <span className="tracker-count">
              {after && (
                <span className="tracker-split">
                  {during[stall.tag]} + {later(stall.tag)}
                </span>
              )}
              {during[stall.tag] + later(stall.tag)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function FlyeringTrackerPage() {
  const tags = STALLS.map((stall) => stall.tag);
  // Two windows over the same guest list (Next dedupes the identical Luma fetches): the race itself, and everything after it.
  const [result, afterResult] = await Promise.all([
    getSourceCounts(EVENT_API_ID, tags, STALLS_OPEN, STALLS_CLOSE),
    getSourceCounts(EVENT_API_ID, tags, STALLS_CLOSE),
  ]);
  const sumStalls = (counts: SourceCounts["counts"]) => STALLS.reduce((sum, stall) => sum + counts[stall.tag], 0);
  const stallTotal = result ? sumStalls(result.counts) : 0;
  const afterTotal = afterResult ? sumStalls(afterResult.counts) : 0;
  const now = new Date();
  const notStarted = now < STALLS_OPEN;
  const closed = now >= STALLS_CLOSE;
  const winners = result && now >= RESULT_AT ? STALLS.filter((stall) => leaders(result.counts).includes(stall.tag)) : [];
  // The wooden spoon goes to last place, but only in the final result: it would flicker between stalls all afternoon.
  const spoons = result && now >= RESULT_AT ? lastPlace(result.counts) : [];

  return (
    <>
      <Nav />
      <NoAnalytics />
      <main className="tracker-page">
        <div className="container">
          <h1 className="tracker-title">Flyering signups, 26 September</h1>
          <p className="tracker-lede">
            Registrations to <a href={EVENT_URL}>the event</a> that came through each stall&rsquo;s QR code, during the flyering and
            afterwards. Updates about once a minute.
          </p>

          {result ? (
            <>
              {notStarted && <p className="tracker-banner">Get ready to flyer! The race starts at 12:00 on Saturday 26 September (BST).</p>}
              {winners.length > 0 && (
                <p className="tracker-banner">
                  🏆 {winners.length > 1 ? "It's a tie between" : "Winner:"} {winners.map((stall) => stall.name).join(" and ")} with{" "}
                  {result.counts[winners[0].tag]}!
                </p>
              )}
              {closed && winners.length === 0 && (
                <p className="tracker-note">
                  {now < RESULT_AT
                    ? "Stalls have closed. Counting the last registrations…"
                    : "Stalls have closed. No one signed up through a stall QR code."}
                </p>
              )}
              <p className="tracker-total">
                <strong>{stallTotal}</strong> during the flyering
                {closed && afterResult && (
                  <>
                    {" "}
                    + <strong>{afterTotal}</strong> since
                  </>
                )}
              </p>
              {closed && afterResult && (
                <p className="tracker-legend">
                  <span className="tracker-swatch tracker-bar-during" aria-hidden="true" /> During flyering (12:00&ndash;16:00)
                  <span className="tracker-swatch tracker-bar-after" aria-hidden="true" /> Afterwards (since 16:00)
                </p>
              )}
              <StallList during={result.counts} after={closed && afterResult ? afterResult.counts : null} spoons={spoons} />
              <p className="tracker-note">
                During the flyering: of {result.total} registrations between 12:00 and 16:00, {result.other} came from elsewhere, or from
                links without a stall tag.
                {closed && afterResult && (
                  <>
                    {" "}
                    Afterwards, the lasting effect of the day: of {afterResult.total} since 16:00, {afterResult.other} came from elsewhere,
                    or from links without a stall tag.
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="tracker-error" role="alert">
              Couldn&rsquo;t load registrations from Luma. Try again in a minute. If it keeps failing, check the Luma access settings: the
              API key may have been disabled or removed.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
