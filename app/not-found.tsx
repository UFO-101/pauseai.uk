import Nav from "@/components/Nav";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main>
        <section className="legal">
          <div className="container legal-container">
            <p className="eyebrow">404</p>
            <h1>Page not found</h1>
            <p className="lede">
              Sorry, we couldn&apos;t find what you were looking for.
            </p>
            <a className="btn primary" href="/">Go to homepage</a>
          </div>
        </section>
      </main>
    </>
  );
}
