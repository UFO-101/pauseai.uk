import { m } from "./classes";
import ShareActions from "./ShareActions";

/** The share step's paper band, with the share card on it. */
export default function ShareBody() {
  return (
    <section className={m("band band-paper share-body")}>
      <div className={m("container")}>
        <ShareActions />
      </div>
    </section>
  );
}
