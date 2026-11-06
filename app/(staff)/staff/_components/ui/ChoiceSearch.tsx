"use client";

import { TextInput } from "@/components/ui/Controls";
import styles from "./FilterBar.module.css";

/**
 * A box over a long list of a filter's choices: the list, the next element
 * after the box, shows nothing until something's typed, then those whose
 * words have it, as it's typed. A list without FilterBar's `.choices`
 * instead shows everything until then, and its rows can each give the words
 * to match in `data-name`, in place of all they say.
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
            item.hidden = !(item.dataset.name ?? item.textContent!).toLowerCase().includes(typed);
          }
        }}
      />
    </span>
  );
}
