import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { BILL_CAMPAIGN } from "@/lib/controlai-letter";
import { campaignBySlug, trackedCampaigns } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Politician } from "@/lib/server/politicians";
import styles from "./staff.module.css";

const bill = campaignBySlug(BILL_CAMPAIGN)!;

type Props = {
  politicians: Politician[];
  /** Marks one as signed, or not, for a campaign staff record: politicianId, campaign, signed. */
  markSigned: (form: FormData) => void | Promise<void>;
};

/**
 * Politicians and their status for each campaign. The letter to the PM is
 * marked signed here, with a button. The bill's column only shows who
 * signed ControlAI's letter: that's set by the nightly import, never by hand.
 */
export default function PoliticianTable({ politicians, markSigned }: Props) {
  if (politicians.length === 0) return <p>{staffCopy.politicians.none}</p>;
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{staffCopy.fields.name}</th>
            <th>{staffCopy.fields.house}</th>
            <th>{staffCopy.fields.constituency}</th>
            <th>{staffCopy.fields.party}</th>
            {trackedCampaigns.map((c) => (
              <th key={c.slug}>{c.title}</th>
            ))}
            <th>{bill.title}</th>
          </tr>
        </thead>
        <tbody>
          {politicians.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/staff/politicians/${p.id}`}>{p.name}</Link>{" "}
                {p.isTest && <span className={styles.tag}>{staffCopy.politicians.testMp}</span>}
                {!p.sitting && <span className={styles.tag}>{staffCopy.politicians.notSitting}</span>}
              </td>
              <td>{staffCopy.houses[p.house]}</td>
              <td>{p.constituency}</td>
              <td>{p.party}</td>
              {trackedCampaigns.map((c) => {
                const status = p.statuses[c.slug];
                return (
                  <td key={c.slug}>
                    <form className={styles.signed} action={markSigned} aria-label={`${c.title}: ${p.name}`}>
                      <input type="hidden" name="politicianId" value={p.id} />
                      <input type="hidden" name="campaign" value={c.slug} />
                      <input type="hidden" name="signed" value={status ? "" : "1"} />
                      {status ? (
                        <span>
                          {staffCopy.statuses[status.status]}
                          {status.date && <span className={styles.muted}> {status.date}</span>}
                        </span>
                      ) : (
                        <span className={styles.muted}>{staffCopy.statuses.none}</span>
                      )}
                      <SubmitButton variant="ghost" size="small">
                        {status ? staffCopy.politicians.unmarkSigned : staffCopy.politicians.markSigned}
                      </SubmitButton>
                    </form>
                  </td>
                );
              })}
              <td>
                {p.statuses[BILL_CAMPAIGN] ? (
                  staffCopy.politicians.signedControlAi
                ) : (
                  <span className={styles.muted}>{staffCopy.statuses.none}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
