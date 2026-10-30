"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Controls";
import { Field, FieldError } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { constituencyCode } from "@/lib/constituencies";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";

type Lookup = { ok: true; mp: { constituency: string } } | { ok: false; message: string };

/**
 * A postcode box that finds its constituency on the map, through the same
 * lookup as Email your MP, and says why when it can't.
 */
export default function PostcodeFinder({ onFound }: { onFound: (code: string) => void }) {
  const [postcode, setPostcode] = useState("");
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function find(event: FormEvent) {
    event.preventDefault();
    setFinding(true);
    setError(null);
    try {
      const res = await fetch("/api/email-your-mp/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode }),
      });
      const found = (await res.json()) as Lookup;
      if (!found.ok) return setError(found.message);
      const code = constituencyCode(found.mp.constituency);
      if (code) onFound(code);
      else setError(copy.finder.notOnMap);
    } catch {
      setError(copy.finder.failed);
    } finally {
      setFinding(false);
    }
  }

  return (
    <div>
      <FilterForm onSubmit={find} noValidate>
        <Field label={copy.finder.label}>
          <TextInput
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            autoComplete="postal-code"
            aria-invalid={error ? true : undefined}
          />
        </Field>
        <Button variant="primary" type="submit" pending={finding}>
          {finding ? copy.finder.finding : copy.finder.button}
        </Button>
      </FilterForm>
      {error && <FieldError announce="alert">{error}</FieldError>}
    </div>
  );
}
