import { staffCopy } from "@/lib/content/staff-interface";
import { requireStaff } from "@/lib/server/staff-auth";
import { addSigner } from "../../actions";
import PoliticianForm from "../../_components/PoliticianForm";
import StaffHeader from "../../_components/StaffHeader";
import styles from "../../_components/staff.module.css";

export default async function AddSignerPage({ searchParams }: { searchParams: Promise<{ missing?: string }> }) {
  const { email } = await requireStaff();
  const { missing } = await searchParams;
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} />
      <h1>{staffCopy.add.title}</h1>
      <p>{staffCopy.add.intro}</p>
      {missing && <p className={styles.error}>{staffCopy.add.nameRequired}</p>}
      <PoliticianForm action={addSigner} submitLabel={staffCopy.add.button} />
    </main>
  );
}
