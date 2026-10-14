import { copy } from "@/lib/content/email-your-mp";
import { CAMPAIGNS_PATH } from "@/lib/email-your-mp";
import { pageMetadata } from "@/lib/metadata";
import ConfirmLetter from "../_components/ConfirmLetter";
import styles from "../_components/EmailYourMp.module.css";

// Where the confirmation email's link goes. Unlisted, and kept out of search.
export const metadata = {
  ...pageMetadata({ title: copy.confirm.title, description: copy.pageDescription, path: `${CAMPAIGNS_PATH}/confirm` }),
  robots: { index: false, follow: false },
};

export default function ConfirmPage() {
  return (
    <main>
      <section className={`container ${styles.page}`}>
        <h1>{copy.confirm.title}</h1>
        <ConfirmLetter />
      </section>
    </main>
  );
}
