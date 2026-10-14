import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "../../_components/staff.module.css";

// Where a login email's link goes. Open to anyone, so it doesn't call
// requireStaff(). Opening it does nothing: only the button logs in, so a
// mail scanner that follows the link doesn't use it up.
export default async function ConfirmLoginPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <main className={`container ${styles.page}`}>
      <h1>{staffCopy.login.title}</h1>
      <form method="post" action="/staff/api/callback">
        <input type="hidden" name="token" value={token} />
        <Button variant="primary" type="submit">
          {staffCopy.login.confirm}
        </Button>
      </form>
    </main>
  );
}
