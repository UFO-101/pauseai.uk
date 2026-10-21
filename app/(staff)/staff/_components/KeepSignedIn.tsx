"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Controls";
import { FieldGroup, Hint } from "@/components/ui/Field";
import { staffCopy } from "@/lib/content/staff-interface";

/** The login form's "Keep me signed in" box, unticked to start, with what it means under it. */
export default function KeepSignedIn() {
  const [keep, setKeep] = useState(false);
  return (
    <FieldGroup>
      <Checkbox name="remember" checked={keep} onChange={setKeep}>
        {staffCopy.login.keep}
      </Checkbox>
      <Hint>{staffCopy.login.keepHint}</Hint>
    </FieldGroup>
  );
}
