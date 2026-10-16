import styles from "./Slider.module.css";

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

export default function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className={styles.slider}>
      <span>{label}</span>
      <input
        type="range"
        className={styles.range}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
