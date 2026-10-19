import type { CSSProperties } from "react";
import styles from "./TokenSamples.module.css";

// The design tokens (styles/tokens.css) drawn, for the gallery's tokens
// page: each colour as a swatch, each size as a bar, each corner on a box.
// Each says its name; the value is the token itself, so it can't be out of
// date.

/** A swatch for each colour token. */
export function ColourSwatches({ tokens }: { tokens: string[] }) {
  return (
    <ul className={styles.swatches}>
      {tokens.map((token) => (
        <li key={token}>
          <span className={styles.swatch} style={{ background: `var(${token})` }} />
          <code>{token}</code>
        </li>
      ))}
    </ul>
  );
}

/** What a size token is for, and how it's drawn. */
type Scale = "space" | "text" | "radius";

const DRAW: Record<Scale, (token: string) => { style: CSSProperties; text: string }> = {
  space: (token) => ({ style: { width: `var(${token})` }, text: "" }),
  text: (token) => ({ style: { fontSize: `var(${token})` }, text: "Sentence case, a full stop." }),
  radius: (token) => ({ style: { borderRadius: `var(${token})` }, text: "" }),
};

/** A row for each token of a scale: its name, then a bar of that width, a line in that size, or a box with those corners. */
export function TokenScale({ scale, tokens }: { scale: Scale; tokens: string[] }) {
  return (
    <ul className={styles.scale}>
      {tokens.map((token) => {
        const { style, text } = DRAW[scale](token);
        return (
          <li key={token}>
            <code>{token}</code>
            <span className={styles[scale]} style={style}>
              {text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The focus ring, on a box that has it. */
export function FocusRing() {
  return (
    <div className={styles.focus}>
      <code>--focus-ring</code>, <code>--focus-offset</code>
    </div>
  );
}
