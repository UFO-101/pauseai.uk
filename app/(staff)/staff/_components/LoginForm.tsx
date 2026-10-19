import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Controls";
import { Field, FieldError } from "@/components/ui/Field";
import { FormStack } from "@/components/ui/Form";
import { staffCopy } from "@/lib/content/staff-interface";
import { LOGIN_PATH } from "@/lib/staff-session";
import styles from "./StaffForms.module.css";

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
      {failed && <FieldError>{staffCopy.login.failed}</FieldError>}
      {elsewhere && <FieldError>{staffCopy.login.elsewhere}</FieldError>}
      <FormStack method="post" action="/staff/api/login" className={styles.login}>
        <Field label={staffCopy.login.emailLabel}>
          <TextInput name="email" type="email" autoComplete="email" required />
        </Field>
        <div>
          <Button variant="primary" size="small" fit type="submit">
            {staffCopy.login.button}
          </Button>
        </div>
      </FormStack>
    </>
  );
}
