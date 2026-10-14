import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Politician } from "@/lib/server/politicians";
import styles from "./staff.module.css";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  politician?: Politician;
  submitLabel: string;
};

/** A signer's details: for adding one by hand, or editing one added that way. */
export default function PoliticianForm({ action, politician, submitLabel }: Props) {
  return (
    <form className={styles.form} action={action}>
      {politician && <input type="hidden" name="id" value={politician.id} />}
      <label>
        {staffCopy.fields.house}
        <select name="house" defaultValue={politician?.house ?? "lords"}>
          {Object.entries(staffCopy.houses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {staffCopy.fields.name}
        <input name="name" required defaultValue={politician?.name} />
      </label>
      <label>
        {staffCopy.fields.salutation}
        <input name="salutation" defaultValue={politician?.salutation} />
      </label>
      <label>
        {staffCopy.fields.constituency}
        <input name="constituency" defaultValue={politician?.constituency ?? ""} />
      </label>
      <label>
        {staffCopy.fields.party}
        <input name="party" defaultValue={politician?.party} />
      </label>
      <label>
        {staffCopy.fields.email}
        <input name="email" type="email" defaultValue={politician?.email ?? ""} />
      </label>
      <SubmitButton variant="primary" size="small">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
