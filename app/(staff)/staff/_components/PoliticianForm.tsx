import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Politician } from "@/lib/server/politicians";
import styles from "./staff.module.css";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  politician: Politician;
};

/** The details of a politician who isn't from Airtable's MPs, such as a peer the signatory import added. */
export default function PoliticianForm({ action, politician }: Props) {
  return (
    <form className={styles.form} action={action}>
      <input type="hidden" name="id" value={politician.id} />
      <label>
        {staffCopy.fields.house}
        <select name="house" defaultValue={politician.house}>
          {Object.entries(staffCopy.houses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {staffCopy.fields.name}
        <input name="name" required defaultValue={politician.name} />
      </label>
      <label>
        {staffCopy.fields.salutation}
        <input name="salutation" defaultValue={politician.salutation} />
      </label>
      <label>
        {staffCopy.fields.constituency}
        <input name="constituency" defaultValue={politician.constituency ?? ""} />
      </label>
      <label>
        {staffCopy.fields.party}
        <input name="party" defaultValue={politician.party} />
      </label>
      <label>
        {staffCopy.fields.email}
        <input name="email" type="email" defaultValue={politician.email ?? ""} />
      </label>
      <SubmitButton variant="primary" size="small">
        {staffCopy.politician.save}
      </SubmitButton>
    </form>
  );
}
