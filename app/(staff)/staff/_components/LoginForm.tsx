import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextInput } from "@/components/ui/Controls";
import { Field, FieldError } from "@/components/ui/Field";
import { FormStack } from "@/components/ui/Form";
import { staffCopy } from "@/lib/content/staff-interface";
import { LOGIN_PATH, NEXT_PARAM } from "@/lib/staff-session";
import KeepSignedIn from "./KeepSignedIn";
import styles from "./StaffForms.module.css";

/**
 * The login page's card's contents, from its URL: the form, with why the
 * last link didn't work if it didn't, or, once a link is sent, word of it.
 * `next` is the page to go to once logged in, passed on with the address.
 */
export default function LoginForm({
  sent,
  failed,
  elsewhere,
  next,
}: {
  sent?: string;
  failed?: string;
  elsewhere?: string;
  next?: string;
}) {
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
        {next && <input type="hidden" name={NEXT_PARAM} value={next} />}
        <Field label={staffCopy.login.emailLabel}>
          <TextInput name="email" type="email" autoComplete="email" required />
        </Field>
        <KeepSignedIn />
        <div>
          <SubmitButton variant="primary" size="small" fit>
            {staffCopy.login.button}
          </SubmitButton>
        </div>
      </FormStack>
    </>
  );
}
