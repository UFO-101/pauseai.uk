import { march } from "@/lib/content/march";
import { site } from "@/lib/content/site";
import { m } from "./classes";

const mapUrl = (stop: { name: string; area: string }) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stop.name}, ${stop.area}`)}`;

const STOPS = [
  { kind: "Start", at: "12:00", stop: march.start },
  { kind: "End", at: "15:00", stop: march.end },
];

/** On the day: the route on a card, and what to bring and how to help beside it. */
export default function SignupDay() {
  return (
    <section className={m("band band-paper")} aria-labelledby="day-title">
      <div className={m("container")}>
        <h2 className={m("h-lg day-title")} id="day-title">
          On the day
        </h2>
        <div className={m("day-grid")}>
          <div className={m("day-card")}>
            <ol className={m("route-stops")}>
              {STOPS.map(({ kind, at, stop }) => (
                <li key={kind}>
                  <span className={m("route-stop-kind")}>
                    {kind} &middot; {at}
                  </span>
                  <a className={m("route-stop-place")} href={mapUrl(stop)} target="_blank" rel="noreferrer">
                    {stop.name}
                  </a>
                  <span className={m("route-stop-area")}>{stop.area}</span>
                </li>
              ))}
            </ol>
            <p className={m("day-card-foot")}>
              <time dateTime={march.dateIso}>{march.dateLong}</time>
            </p>
          </div>

          <div>
            <div className={m("day-note")}>
              <h3 className={m("h-sm day-note-title")}>What to bring</h3>
              <p>
                Bring a poster or sign if you can, but most of all, bring a friend or family member. We need every
                person to step up and help bring about an actual change to the law.
              </p>
            </div>
            <div className={m("day-note")}>
              <h3 className={m("h-sm day-note-title")}>Get involved</h3>
              <p>
                We&rsquo;re looking for volunteers to help with{" "}
                <a className={m("inline-link")} href={site.social.luma} target="_blank" rel="noreferrer">
                  tabling and flyering
                </a>{" "}
                to advertise the protest. If you&rsquo;re interested in volunteering for several hours a week, please
                email{" "}
                <a className={m("inline-link")} href={`mailto:${site.contactEmail}`}>
                  {site.contactEmail}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
