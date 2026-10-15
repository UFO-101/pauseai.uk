import type { ReactNode } from "react";

/** A page of its own after a campaign's form: the preview, or "sent". Its heading, then what's on it. */
export default function LetterStep({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="campaigns">
      <section className="campaigns-hero">
        <div className="container">
          <h1>{title}</h1>
        </div>
      </section>
      <section className="campaigns-embed">
        <div className="container">{children}</div>
      </section>
    </main>
  );
}
