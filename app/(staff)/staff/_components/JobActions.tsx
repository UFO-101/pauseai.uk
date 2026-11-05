"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Controls";
import { SubmitButton } from "@/components/ui/SubmitButton";
import Actions from "@/components/ui/Actions";
import styles from "./ImportJob.module.css";

/** A job's button, on its page: runs it now, with `tick`, if it has one, a box that goes with the press. */
export default function JobActions({
  action,
  label,
  tick,
}: {
  action: (form: FormData) => void | Promise<void>;
  label: string;
  tick?: { name: string; label: string };
}) {
  const [ticked, setTicked] = useState(false);
  return (
    <Actions>
      <form action={action} className={styles.job}>
        {tick && (
          <Checkbox name={tick.name} value="on" checked={ticked} onChange={setTicked}>
            {tick.label}
          </Checkbox>
        )}
        <SubmitButton variant="primary" size="small">
          {label}
        </SubmitButton>
      </form>
    </Actions>
  );
}
