import { m } from "./classes";

/*
 * The march's one demand, on the page's one band that is neither ink nor
 * paper: it's the ask, and should be impossible to scroll past unread.
 */
export default function SignupDemand() {
  return (
    <section className={m("demand")} aria-labelledby="demand-title">
      <div className={m("container demand-grid")}>
        <h2 className={m("h-lg demand-title")} id="demand-title">
          What we
          <br />
          want
        </h2>

        <div>
          <p className={m("demand-text")}>
            The UK has no specific legal standards for AI. No regulator oversees frontier AI development. And UK law
            does not reliably hold developers liable for damage or deaths caused by their models, even when the danger
            is predictable, preventable and uniquely enabled by AI.
          </p>
          <p className={m("demand-sum")}>
            In short, UK law neither requires developers to guard against frontier AI risks, nor exposes them to any
            financial consequence if they fail to do so.
          </p>
          <p className={m("demand-call")}>
            It&rsquo;s time for the government to step in. We call on the Prime Minister to introduce frontier AI
            legislation to prevent catastrophe.
          </p>
        </div>
      </div>
    </section>
  );
}
