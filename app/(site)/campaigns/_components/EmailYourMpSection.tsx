import EmailYourMpTool from "./EmailYourMpTool";
import styles from "./EmailYourMp.module.css";

type Props = {
  campaignSlug: string;
  /** Lists the test MPs' postcodes under the form: for sites other than production. */
  showTestMps?: boolean;
};

/** The form, where today's /campaigns has its iframe. The hero's button links here. */
export default function EmailYourMpSection(props: Props) {
  return (
    <section id="email-your-mp" className={`campaigns-embed ${styles.section}`}>
      <div className="container">
        <h2>Email your MP</h2>
        <EmailYourMpTool {...props} />
      </div>
    </section>
  );
}
