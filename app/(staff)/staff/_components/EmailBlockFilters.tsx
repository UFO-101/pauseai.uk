import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { staffCopy } from "@/lib/content/staff-interface";
import StaffFilters from "./StaffFilters";

/** Which blocked addresses the page at `action` lists: those like a search, and those that bounced, or complained. */
export default function EmailBlockFilters({ q, kind, action }: { q: string; kind: string; action: string }) {
  const { columns, kinds } = staffCopy.emails;
  return (
    <StaffFilters key={[q, kind].join("\n")} action={action}>
      <Field label={columns.address}>
        <TextInput type="search" name="q" defaultValue={q} />
      </Field>
      <Button variant="primary" size="small" type="submit">
        {staffCopy.search}
      </Button>
      <Field label={columns.kind}>
        <Select name="kind" defaultValue={kind}>
          <option value="">{staffCopy.emails.allKinds}</option>
          <option value="hard">{kinds.hard}</option>
          <option value="complaint">{kinds.complaint}</option>
        </Select>
      </Field>
    </StaffFilters>
  );
}
