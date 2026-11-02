"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";

/** How long a delete waits for its second press. */
const ARMED_FOR = 4000;

/**
 * The button, inside its form: the ghost one naming what it deletes, or,
 * armed, the red one that sends the form. It stays red and pending while
 * the form is sent, though the pending button, disabled, loses the focus.
 */
function Press({
  label,
  disabled,
  danger,
  short,
}: {
  label: string;
  disabled: boolean;
  danger: boolean;
  short: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARMED_FOR);
    return () => clearTimeout(timer);
  }, [armed]);
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
 * Save and Cancel), and `short` asks for the second in fewer words.
 */
export function DeleteTwice({
  name,
  value,
  label,
  disabled = false,
  danger = false,
  short = false,
  action,
}: {
  name: string;
  value: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  short?: boolean;
  action: (form: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name={name} value={value} />
      <Press label={label} disabled={disabled} danger={danger} short={short} />
    </form>
  );
}
