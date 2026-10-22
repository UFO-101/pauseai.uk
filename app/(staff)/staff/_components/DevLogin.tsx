import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { DEV_LOGIN_PATH } from "@/lib/staff-session";
import styles from "./DevLogin.module.css";

const copy = staffCopy.devLogin;

/**
 * The dev login, only in a fixture build (DATA_FIXTURES=1): under the
 * login card, a box in the development colour, a button per address that
 * signs in as them at once, with no email; the last has no account, to see
 * what someone not yet added sees. Given no addresses, as outside a
 * fixture build (lib/server/dev-login.ts), it's nothing; the route refuses
 * it there too.
 */
export default function DevLogin({ accounts }: { accounts: string[] | undefined }) {
  if (!accounts) return null;
  return (
    <section className={styles.dev} aria-label={copy.title}>
      <h2 className={styles.title}>{copy.title}</h2>
      <p className={styles.hint}>{copy.hint}</p>
      <div className={styles.buttons}>
        {accounts.map((email) => (
          <form key={email} method="post" action={DEV_LOGIN_PATH}>
            <input type="hidden" name="email" value={email} />
            <Button variant="ghost" size="small" type="submit">
              {email}
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}
