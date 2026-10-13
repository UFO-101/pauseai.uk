
// The email-your-MP form, embedded from pauseai.info.
export default function EmailYourMp() {
  return (
    <section id="email-your-mp" className="campaigns-embed">
      <div className="container">
        <h2>Email your MP</h2>
        <div className="embed-frame">
          <iframe
            id="campaigns-embed"
            src="https://pauseai.info/embed/uk-email-mp"
            title="Email your MP — PauseAI"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
        <p className="embed-fallback">
          Having trouble loading the form?{" "}
          <a href="https://pauseai.info/uk-email-mp" target="_blank" rel="noreferrer">Open it on pauseai.info &rarr;</a>
        </p>
      </div>
    </section>
  );
}
