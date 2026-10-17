import Nav from "@/components/layout/Nav";
import { ButtonLink } from "@/components/ui/Button";
import ProsePage from "@/components/ui/ProsePage";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main>
        <ProsePage>
          <p>404</p>
          <h1>Page not found</h1>
          <p>Sorry, we couldn&apos;t find what you were looking for.</p>
          <ButtonLink variant="primary" href="/">
            Go to homepage
          </ButtonLink>
        </ProsePage>
      </main>
    </>
  );
}
