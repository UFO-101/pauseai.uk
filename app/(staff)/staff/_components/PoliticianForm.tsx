import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FormStack } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Politician } from "@/lib/server/politicians";
import styles from "./StaffForms.module.css";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  politician: Politician;
};

/** The details of a politician who isn't from Airtable's MPs, such as a peer the signatory import added. */
export default function PoliticianForm({ action, politician }: Props) {
  return (
    <FormStack action={action} className={styles.form}>
      <input type="hidden" name="id" value={politician.id} />
      <Field label={staffCopy.fields.house}>
        <Select name="house" defaultValue={politician.house}>
          {Object.entries(staffCopy.houses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={staffCopy.fields.name}>
        <TextInput name="name" required defaultValue={politician.name} />
      </Field>
      <Field label={staffCopy.fields.salutation}>
        <TextInput name="salutation" defaultValue={politician.salutation} />
      </Field>
      <Field label={staffCopy.fields.constituency}>
        <TextInput name="constituency" defaultValue={politician.constituency ?? ""} />
      </Field>
      <Field label={staffCopy.fields.party}>
        <TextInput name="party" defaultValue={politician.party} />
      </Field>
      <Field label={staffCopy.fields.email}>
        <TextInput name="email" type="email" defaultValue={politician.email ?? ""} />
      </Field>
      <div>
        <SubmitButton variant="primary" size="small" fit>
          {staffCopy.politician.save}
        </SubmitButton>
      </div>
    </FormStack>
  );
}
