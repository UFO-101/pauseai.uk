import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import type { StatusRecord } from "@/lib/server/politicians";
import styles from "./staff.module.css";

type Props = {
  politicianId: number;
  campaign: { slug: string; title: string };
  current?: StatusRecord;
  action: (formData: FormData) => void | Promise<void>;
};

/** One politician's status for one campaign: signed, supports, or nothing. */
export default function StatusForm({ politicianId, campaign, current, action }: Props) {
  return (
    <form className={styles.form} action={action} aria-label={campaign.title}>
      <h3>{campaign.title}</h3>
      <input type="hidden" name="politicianId" value={politicianId} />
      <input type="hidden" name="campaign" value={campaign.slug} />
      <label>
        {staffCopy.fields.status}
        <select name="status" defaultValue={current?.status ?? ""}>
          <option value="">{staffCopy.statuses.none}</option>
          <option value="signed">{staffCopy.statuses.signed}</option>
          <option value="supports">{staffCopy.statuses.supports}</option>
        </select>
      </label>
      <label>
        {staffCopy.fields.date}
        <input type="date" name="date" defaultValue={current?.date ?? ""} />
      </label>
      <label>
        {staffCopy.fields.note}
        <textarea name="note" rows={2} defaultValue={current?.note ?? ""} />
      </label>
      {current && <p className={styles.muted}>{staffCopy.fields.updated(current.updatedBy, new Date(current.updatedAt).toLocaleString("en-GB"))}</p>}
      <Button variant="primary" size="small" type="submit">
        {staffCopy.politician.save}
      </Button>
    </form>
  );
}
