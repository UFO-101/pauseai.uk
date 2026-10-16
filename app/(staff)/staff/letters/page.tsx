import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { recentLetters } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import LettersTable from "../_components/LettersTable";
import StaffHeader from "../_components/StaffHeader";
import styles from "../_components/staff.module.css";

export default async function LettersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { email } = await requireStaff();
  const { status = "" } = await searchParams;
  const letters = await recentLetters({ status: status in staffCopy.letters.status ? status : undefined });
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} current="letters" />
      <h1>{staffCopy.letters.title}</h1>
      <form className={styles.filters} method="get" action="/staff/letters">
        <label>
          {staffCopy.letters.columns.status}
          <select name="status" defaultValue={status}>
            <option value="">{staffCopy.letters.allStatuses}</option>
            {Object.entries(staffCopy.letters.status).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button variant="primary" size="small" type="submit">
          {staffCopy.letters.filter}
        </Button>
      </form>
      <LettersTable letters={letters} />
    </main>
  );
}
