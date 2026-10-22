import { Button } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { DevLoginChoice } from "@/lib/server/dev-login";
import { DEV_LOGIN_PATH } from "@/lib/staff-session";
import styles from "./DevLogin.module.css";

const copy = staffCopy.devLogin;

/**
 * The dev login, only in a fixture build (DATA_FIXTURES=1): under the
 * login card, a box in the development colour, a line per address with a
 * button that signs in as them at once, with no email, and what they are:
 * their permissions, an account with none, or no account. Given no
 * addresses, as outside a fixture build (lib/server/dev-login.ts), it's
 * nothing; the route refuses it there too.
 */
export default function DevLogin({ accounts }: { accounts: DevLoginChoice[] | undefined }) {
  if (!accounts) return null;
  return (
    <section className={styles.dev} aria-label={copy.title}>
      <h2 className={styles.title}>{copy.title}</h2>
      <p className={styles.hint}>{copy.hint}</p>
      <ul className={styles.choices}>
        {accounts.map(({ email, description }) => (
          <li key={email}>
            <form method="post" action={DEV_LOGIN_PATH}>
              <input type="hidden" name="email" value={email} />
              <Button variant="ghost" size="small" type="submit">
                {email}
              </Button>
            </form>
            <Muted>{description}</Muted>
          </li>
        ))}
      </ul>
    </section>
  );
}
