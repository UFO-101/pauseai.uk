"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { ButtonInside } from "@/components/ui/Button";
import { menuItemClass } from "./Menu";

/**
 * A menu's item that sends the form around it, waiting as a button does
 * (docs/style-guide.md, "Buttons that wait"): greyed and unpressable from the
 * press, with a spinner over its words if that takes more than a moment. The
 * menu stays open meanwhile, and whatever the form changes closes it, by
 * bringing the next page or a new key. `className` is another look of a menu's
 * item (Menu.tsx).
 */
export default function MenuSubmit({
  className = menuItemClass,
  children,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "disabled">) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} type="submit" className={className} disabled={pending} aria-busy={pending || undefined}>
      <ButtonInside pending={pending}>{children}</ButtonInside>
    </button>
  );
}
