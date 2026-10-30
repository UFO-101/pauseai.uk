"use client";

import { useRef, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./Button";
import { useFormLeaving } from "./useLeaving";

/**
 * A form's submit button that is pending while its work goes on: while the
 * form's action runs, for a form whose action is a function (a Server
 * Action); or, for one that posts to a URL, from its sending until the
 * next page comes.
 */
export function SubmitButton(props: Omit<ComponentProps<typeof Button>, "type" | "pending" | "ref">) {
  const { pending } = useFormStatus();
  const button = useRef<HTMLButtonElement>(null);
  const leaving = useFormLeaving(button);
  return <Button {...props} ref={button} type="submit" pending={pending || leaving} />;
}
