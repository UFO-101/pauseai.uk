/** Shows "n / max" once a field is 80% full, so a volunteer knows why typing stops. */
export default function CharCount({ value, max }: { value: string; max?: number }) {
  if (!max || value.length < max * 0.8) return null;
  return (
    <span className={`collateral-count${value.length >= max ? " is-full" : ""}`} aria-live="polite">
      {value.length} / {max}
    </span>
  );
}
