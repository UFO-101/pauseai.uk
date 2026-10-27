"use client";

import { TextInput } from "@/components/ui/Controls";
import styles from "./FilterBar.module.css";

/**
 * A box over a long list of a filter's choices: the list, the next element
 * after the box, shows nothing until something's typed, then those whose
 * words have it, as it's typed.
 */
export default function ChoiceSearch({ label }: { label: string }) {
  return (
    <span className={styles.choiceSearch}>
      <TextInput
        type="search"
        aria-label={label}
        placeholder={label}
        onInput={(event) => {
          const typed = event.currentTarget.value.trim().toLowerCase();
          const list = event.currentTarget.parentElement!.nextElementSibling as HTMLElement;
          list.dataset.search = typed ? "typed" : "empty";
          for (const item of list.querySelectorAll("li")) {
            item.hidden = !item.textContent!.toLowerCase().includes(typed);
          }
        }}
      />
    </span>
  );
}
