import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { LOGIN_PATH } from "@/lib/staff-session";
import StaffHeader from "../_components/StaffHeader";
import ErrorText from "../_components/ui/ErrorText";
import { StaffForm } from "../_components/ui/forms";
import LoginCard from "../_components/LoginCard";
import StaffPage from "../_components/ui/StaffPage";

// Open to anyone: it's where staff log in, so it doesn't call requireStaff().
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; failed?: string; elsewhere?: string }>;
}) {
  const { sent, failed, elsewhere } = await searchParams;
  return (
    <StaffPage>
      <StaffHeader />
      <LoginCard title={staffCopy.login.title}>
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
        )}
      </LoginCard>
    </StaffPage>
  );
}
