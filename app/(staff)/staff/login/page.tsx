import { ButtonAnchor } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "../_components/staff.module.css";

// Open to anyone: it's where staff log in, so it doesn't call requireStaff().
// A link rather than a form, because the site's form-action 'self' would
// block a form that redirects to Google.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ failed?: string }> }) {
  const { failed } = await searchParams;
  return (
    <main className={`container ${styles.page}`}>
      <h1>{staffCopy.login.title}</h1>
      <p>{staffCopy.login.intro}</p>
      {failed && <p className={styles.error}>{staffCopy.login.failed}</p>}
      <ButtonAnchor variant="primary" href="/staff/api/login">
        {staffCopy.login.button}
      </ButtonAnchor>
    </main>
  );
}
