"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Controls";
import { staffCopy } from "@/lib/content/staff-interface";

/** The login form's "Keep me signed in" box, unticked to start. */
export default function KeepSignedIn() {
  const [keep, setKeep] = useState(false);
  return (
    <Checkbox name="remember" checked={keep} onChange={setKeep}>
      {staffCopy.login.keep}
    </Checkbox>
  );
}
