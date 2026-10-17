import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { LOGIN_PATH } from "@/lib/staff-session";
import ErrorText from "./ui/ErrorText";
import { StaffForm } from "./ui/forms";

/**
 * The login page's card's contents, from its URL: the form, with why the
 * last link didn't work if it didn't, or, once a link is sent, word of it.
 */
export default function LoginForm({ sent, failed, elsewhere }: { sent?: string; failed?: string; elsewhere?: string }) {
  if (sent) {
    // Replaces the form, so the page visibly changes once the link is sent.
    return (
      <>
        <p role="status">{staffCopy.login.sent}</p>
        <p>
          <Link href={LOGIN_PATH}>{staffCopy.login.again}</Link>
        </p>
      </>
    );
  }
  return (
    <>
      <p>{staffCopy.login.intro}</p>
      {failed && (
        <p>
          <ErrorText>{staffCopy.login.failed}</ErrorText>
        </p>
      )}
      {elsewhere && (
        <p>
          <ErrorText>{staffCopy.login.elsewhere}</ErrorText>
        </p>
      )}
      <StaffForm method="post" action="/staff/api/login">
        <label>
          {staffCopy.login.emailLabel}
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <div>
          <Button variant="primary" size="small" fit type="submit">
            {staffCopy.login.button}
          </Button>
        </div>
      </StaffForm>
    </>
  );
}
