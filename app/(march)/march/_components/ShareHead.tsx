import { m } from "./classes";

/** The top of the share step: they're registered, now bring people. */
export default function ShareHead() {
  return (
    <section className={m("band band-ink share-head")}>
      <div className={m("container")}>
        <p className={m("eyebrow share-eyebrow")}>
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          You&rsquo;ve registered
        </p>
        <h1 className={m("h-lg")}>
          Now bring
          <br />
          people with you
        </h1>
        <p className={m("lede share-lede")}>
          Please share with <strong>as many people and groups as you can think of</strong>. Our entire future is at
          stake.
        </p>
      </div>
    </section>
  );
}
