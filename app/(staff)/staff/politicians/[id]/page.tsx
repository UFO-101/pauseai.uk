import { notFound } from "next/navigation";
import { staffCopy } from "@/lib/content/staff-interface";
import { getPolitician } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { editSigner } from "../../actions";
import PoliticianForm from "../../_components/PoliticianForm";
import StaffHeader from "../../_components/StaffHeader";
import styles from "../../_components/staff.module.css";

export default async function PoliticianPage({ params }: { params: Promise<{ id: string }> }) {
  const { email } = await requireStaff();
  const { id } = await params;
  const politician = /^\d+$/.test(id) ? await getPolitician(Number(id)) : undefined;
  if (!politician) notFound();
  const editable = politician.airtableId === null && !politician.isTest;
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} />
      <h1>{politician.name}</h1>
      <p className={styles.muted}>
        {[staffCopy.houses[politician.house], politician.constituency, politician.party, politician.email]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <h2>{staffCopy.politician.detailsTitle}</h2>
      {editable ? (
        <PoliticianForm action={editSigner} politician={politician} />
      ) : (
        <p>{staffCopy.politician.fromAirtable}</p>
      )}
    </main>
  );
}
