import { lastPlace, leaders, ranks, type SourceCounts } from "@/lib/trackers";

/** One flyering race: the event it recruits for, when it ran, and who took part. */
export type FlyeringRace = {
  /** "26 September": for the heading and page title. */
  date: string;
  /** "Saturday 26 September": for the countdown banner. */
  day: string;
  eventApiId: string;
  eventUrl: string;
  /** Registrations count towards the race from `open` until `close`. */
  open: Date;
  close: Date;
  /** "stall" or "team": what each QR code belongs to. */
  unit: string;
  /** How the page says the race has ended, e.g. "Stalls have closed." */
  closedMessage: string;
  /** What a registration without a recognised utm_source lacks, e.g. "a stall tag". */
  untagged: string;
  /** Each QR code's utm_source tag, and the name to show for it. */
  stalls: readonly { tag: string; name: string }[];
};

// Pages and Luma responses are cached for up to a minute, so wait a few minutes after close before naming a winner,
// or a late registration could still flip the result after it was announced.
const RESULT_DELAY_MS = 5 * 60 * 1000;

const MEDALS = [
  { emoji: "🥇", label: "gold medal" },
  { emoji: "🥈", label: "silver medal" },
  { emoji: "🥉", label: "bronze medal" },
];

/** "12:00", in UK time. */
export function ukTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

// One row per stall, busiest in the race first. Each bar is the race count with the afterwards count stacked on the end, on one shared scale.
// Medals and the wooden spoon belong to the race alone.
function StallList({
  stalls,
  during,
  after,
  spoons,
}: {
  stalls: FlyeringRace["stalls"];
  during: SourceCounts["counts"];
  after: SourceCounts["counts"] | null;
  spoons: string[];
}) {
  const order = [...stalls].sort((a, b) => during[b.tag] - during[a.tag]);
  const rankOf = ranks(during);
  const later = (tag: string) => after?.[tag] ?? 0;
  const longest = Math.max(...stalls.map((stall) => during[stall.tag] + later(stall.tag)));
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

/**
 * The live leaderboard for a flyering race. `result` counts registrations
 * during the race and `afterResult` since it closed; either is null when Luma
 * couldn't be read. `now` decides which stage the race is at.
 */
export default function FlyeringTracker({
  race,
  result,
  afterResult,
  now,
}: {
  race: FlyeringRace;
  result: SourceCounts | null;
  afterResult: SourceCounts | null;
  now: Date;
}) {
  const { stalls } = race;
  const resultAt = new Date(race.close.getTime() + RESULT_DELAY_MS);
  const openTime = ukTime(race.open);
  const closeTime = ukTime(race.close);
  const sumStalls = (counts: SourceCounts["counts"]) => stalls.reduce((sum, stall) => sum + counts[stall.tag], 0);
  const stallTotal = result ? sumStalls(result.counts) : 0;
  const afterTotal = afterResult ? sumStalls(afterResult.counts) : 0;
  const notStarted = now < race.open;
  const closed = now >= race.close;
  const winners = result && now >= resultAt ? stalls.filter((stall) => leaders(result.counts).includes(stall.tag)) : [];
  // The wooden spoon goes to last place, but only in the final result: it would flicker between stalls all afternoon.
  const spoons = result && now >= resultAt ? lastPlace(result.counts) : [];

  return (
    <main className="tracker-page">
      <div className="container">
        <h1 className="tracker-title">Flyering signups, {race.date}</h1>
        <p className="tracker-lede">
          Registrations to <a href={race.eventUrl}>the event</a> that came through each {race.unit}&rsquo;s QR code, during the
          flyering and afterwards. Updates about once a minute.
        </p>

        {result ? (
          <>
            {notStarted && (
              <p className="tracker-banner">
                Get ready to flyer! The race starts at {openTime} on {race.day} (BST).
              </p>
            )}
            {winners.length > 0 && (
              <p className="tracker-banner">
                🏆 {winners.length > 1 ? "It's a tie between" : "Winner:"} {winners.map((stall) => stall.name).join(" and ")} with{" "}
                {result.counts[winners[0].tag]}!
              </p>
            )}
            {closed && winners.length === 0 && (
              <p className="tracker-note">
                {now < resultAt
                  ? `${race.closedMessage} Counting the last registrations…`
                  : `${race.closedMessage} No one signed up through a ${race.unit} QR code.`}
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
                <span className="tracker-swatch tracker-bar-during" aria-hidden="true" /> During flyering ({openTime}&ndash;{closeTime})
                <span className="tracker-swatch tracker-bar-after" aria-hidden="true" /> Afterwards (since {closeTime})
              </p>
            )}
            <StallList stalls={stalls} during={result.counts} after={closed && afterResult ? afterResult.counts : null} spoons={spoons} />
            <p className="tracker-note">
              During the flyering: of {result.total} registrations between {openTime} and {closeTime}, {result.other} came from
              elsewhere, or from links without {race.untagged}.
              {closed && afterResult && (
                <>
                  {" "}
                  Afterwards, the lasting effect of the day: of {afterResult.total} since {closeTime}, {afterResult.other} came from
                  elsewhere, or from links without {race.untagged}.
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
  );
}
