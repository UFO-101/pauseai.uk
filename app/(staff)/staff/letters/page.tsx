import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { recentLetters } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import LettersTable from "../_components/LettersTable";
import StaffHeader from "../_components/StaffHeader";
import { Filters } from "../_components/ui/forms";
import StaffPage from "../_components/ui/StaffPage";

export default async function LettersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { email } = await requireStaff();
  const { status = "" } = await searchParams;
  const letters = await recentLetters({ status: status in staffCopy.letters.status ? status : undefined });
  return (
    <StaffPage>
      <StaffHeader email={email} current="letters" />
      <h1>{staffCopy.letters.title}</h1>
      <Filters method="get" action="/staff/letters">
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
      </Filters>
      <LettersTable letters={letters} />
    </StaffPage>
  );
}
