import type { ButtonHTMLAttributes } from "react";
import styles from "./IconButton.module.css";

export type IconButtonLook = "outline" | "raised" | "dark";

/**
 * A round button with an icon (or a single glyph) in it, and an accessible
 * name in `aria-label`. `outline` is a thin ring that fills orange on
 * hover; `raised` a white disc with a shadow; `dark` a pale ring for a dark
 * backdrop. Its diameter is `--icon-button-size`, which a container can set
 * on itself, or `size` sets on the button. A className is for its place in
 * the layout (position, offsets), never its look.
 */
export default function IconButton({
  look,
  size,
  className,
  style,
  type = "button",
  ...rest
}: { look: IconButtonLook; size?: number } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      type={type}
      className={[styles.button, styles[look], className].filter(Boolean).join(" ")}
      style={size ? { ...style, ["--icon-button-size" as string]: `${size}px` } : style}
    />
  );
}
