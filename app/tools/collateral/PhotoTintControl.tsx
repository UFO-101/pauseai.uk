/** Clear or tinted photo, for a logo cover (see DigitalFormat.logoCover), where no text has to read over it. */
export default function PhotoTintControl({ clear, onChange }: { clear: boolean; onChange: (clear: boolean) => void }) {
  return (
    <>
      <span className="collateral-label">Photo on the Luma cover</span>
      <div className="collateral-segmented" role="radiogroup" aria-label="Photo on the Luma cover">
        <button type="button" role="radio" aria-checked={!clear} onClick={() => onChange(false)}>
          Tinted
        </button>
        <button type="button" role="radio" aria-checked={clear} onClick={() => onChange(true)}>
          Clear
        </button>
      </div>
    </>
  );
}
