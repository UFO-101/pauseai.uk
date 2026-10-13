import Nav from "@/components/layout/Nav";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main>
        <section className="legal">
          <div className="container legal-container">
            <p className="lede">404</p>
            <h1>Page not found</h1>
            <p className="lede">
              Sorry, we couldn&apos;t find what you were looking for.
            </p>
            <ButtonLink variant="primary" href="/">Go to homepage</ButtonLink>
          </div>
        </section>
      </main>
    </>
  );
}
