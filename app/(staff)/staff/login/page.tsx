import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "../_components/staff.module.css";

// Open to anyone: it's where staff log in, so it doesn't call requireStaff().
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; failed?: string }> }) {
  const { sent, failed } = await searchParams;
  return (
    <main className={`container ${styles.page}`}>
      <h1>{staffCopy.login.title}</h1>
      <p>{staffCopy.login.intro}</p>
      {sent && <p role="status">{staffCopy.login.sent}</p>}
      {failed && <p className={styles.error}>{staffCopy.login.failed}</p>}
      <form className={styles.form} method="post" action="/staff/api/login">
        <label>
          {staffCopy.login.emailLabel}
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <Button variant="primary" type="submit">
          {staffCopy.login.button}
        </Button>
      </form>
    </main>
  );
}
