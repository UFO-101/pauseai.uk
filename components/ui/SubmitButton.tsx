"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./Button";

/**
 * A form's submit button that is disabled, with a spinner, while the form's
 * action runs. Only works for forms whose action is a function (a server
 * action); a plain POST to a URL reloads the page instead.
 */
export function SubmitButton(props: Omit<ComponentProps<typeof Button>, "type" | "pending">) {
  const { pending } = useFormStatus();
  return <Button {...props} type="submit" pending={pending} />;
}
