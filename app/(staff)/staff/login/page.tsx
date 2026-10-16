import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { LOGIN_PATH } from "@/lib/staff-session";
import StaffHeader from "../_components/StaffHeader";
import styles from "../_components/staff.module.css";

// Open to anyone: it's where staff log in, so it doesn't call requireStaff().
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; failed?: string; elsewhere?: string }>;
}) {
  const { sent, failed, elsewhere } = await searchParams;
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader />
      <div className={styles.login}>
        <h1>{staffCopy.login.title}</h1>
        {sent ? (
          // Replaces the form, so the page visibly changes once the link is sent.
          <>
            <p role="status">{staffCopy.login.sent}</p>
            <p>
              <Link href={LOGIN_PATH}>{staffCopy.login.again}</Link>
            </p>
          </>
        ) : (
          <>
            <p>{staffCopy.login.intro}</p>
            {failed && <p className={styles.error}>{staffCopy.login.failed}</p>}
            {elsewhere && <p className={styles.error}>{staffCopy.login.elsewhere}</p>}
            <form className={styles.form} method="post" action="/staff/api/login">
              <label>
                {staffCopy.login.emailLabel}
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <div>
                <Button variant="primary" size="small" type="submit">
                  {staffCopy.login.button}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
