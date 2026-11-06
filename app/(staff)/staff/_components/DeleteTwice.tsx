"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { menuItemArmedClass, menuItemDangerClass } from "./ui/Menu";

/** How long a delete waits for its second press. */
const ARMED_FOR = 4000;

/**
 * The button, inside its form: the ghost one naming what it deletes, or,
 * armed, the red one that sends the form. It stays red and pending while
 * the form is sent, though the pending button, disabled, loses the focus.
 * As a menu's item, the same two in a menu item's look.
 */
function Press({
  label,
  disabled,
  danger,
  short,
  menuItem,
}: {
  label: string;
  disabled: boolean;
  danger: boolean;
  short: boolean;
  menuItem: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARMED_FOR);
    return () => clearTimeout(timer);
  }, [armed]);
  if (menuItem) {
    // Two buttons, not one that changes: one turning into submit as it's clicked would send the form on the first press.
    return armed || pending ? (
      <button
        key="armed"
        type="submit"
        className={menuItemArmedClass}
        disabled={pending}
        autoFocus
        onBlur={() => setArmed(false)}
      >
        {staffCopy.deleteIt}
      </button>
    ) : (
      <button key="first" type="button" className={menuItemDangerClass} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return armed || pending ? (
    <SubmitButton variant="danger" size="small" fit autoFocus onBlur={() => setArmed(false)}>
      {short ? staffCopy.deleteItShort : staffCopy.deleteIt}
    </SubmitButton>
  ) : (
    <Button
      variant={danger ? "danger" : "ghost"}
      size="small"
      fit
      type="button"
      disabled={disabled}
      onClick={() => setArmed(true)}
    >
      {label}
    </Button>
  );
}

/**
 * A delete button, pressed twice: the first press turns it red, asking for
 * a second, which sends the form, with `name` set to `value`; it turns back
 * if the second doesn't come within ARMED_FOR, or focus goes elsewhere.
 * `danger` makes the first red too, among a form's own buttons (a note's
 * Save and Cancel), and `short` asks for the second in fewer words. `fields`
 * are any more values for the form to send. `menuItem` draws it as a menu's
 * item, a line among others (ui/Menu).
 */
export function DeleteTwice({
  name,
  value,
  label,
  disabled = false,
  danger = false,
  short = false,
  menuItem = false,
  fields = {},
  action,
}: {
  name: string;
  value: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  short?: boolean;
  menuItem?: boolean;
  fields?: Record<string, string>;
  action: (form: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name={name} value={value} />
      {Object.entries(fields).map(([field, one]) => (
        <input key={field} type="hidden" name={field} value={one} />
      ))}
      <Press label={label} disabled={disabled} danger={danger} short={short} menuItem={menuItem} />
    </form>
  );
}
