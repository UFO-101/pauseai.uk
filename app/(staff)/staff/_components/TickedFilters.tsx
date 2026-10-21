"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Controls";

export type TickedFilter = { name: string; label: string; ticked: boolean };

/** The yes-or-no filters of a GET form: each a checkbox, in the URL while ticked. */
export default function TickedFilters({ boxes }: { boxes: TickedFilter[] }) {
  const [ticked, setTicked] = useState(() => new Set(boxes.filter((box) => box.ticked).map((box) => box.name)));
  return (
    <>
      {boxes.map((box) => (
        <Checkbox
          key={box.name}
          name={box.name}
          checked={ticked.has(box.name)}
          onChange={(on) =>
            setTicked((was) => {
              const next = new Set(was);
              if (on) next.add(box.name);
              else next.delete(box.name);
              return next;
            })
          }
        >
          {box.label}
        </Checkbox>
      ))}
    </>
  );
}
