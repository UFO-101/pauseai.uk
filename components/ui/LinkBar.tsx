"use client";

import type { Editor } from "@tiptap/react";
import { useId, useState } from "react";
import { Button } from "./Button";
import { TextInput } from "./Controls";
import { FieldError } from "./Field";
import { linkHref } from "@/lib/letter-format";
import styles from "./LinkBar.module.css";

/** The link bar's words, from the copy of the editor it's in. */
export type LinkWords = { address: string; save: string; remove: string; cancel: string; invalid: string };

/**
 * Under a letter editor's toolbar: where the link at the cursor goes, or a
 * new one for the text selected, to save, change or remove. With nothing
 * selected, the address is put in as a link to itself. Enter saves and
 * Escape closes; either way the cursor goes back to the letter.
 */
export default function LinkBar({ editor, words, onClose }: { editor: Editor; words: LinkWords; onClose: () => void }) {
  const current: string | undefined = editor.getAttributes("link").href;
  const [typed, setTyped] = useState(current ?? "");
  const [wrong, setWrong] = useState(false);
  const errorId = useId();

  function close() {
    onClose();
    editor.commands.focus();
  }

  function save() {
    const href = linkHref(typed);
    if (!href) return setWrong(true);
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !current) {
      chain.insertContent({ type: "text", text: typed.trim(), marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.setLink({ href }).run();
    }
    onClose();
  }

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <span className={styles.address}>
          <TextInput
            type="url"
            aria-label={words.address}
            placeholder="https://"
            autoFocus
            value={typed}
            aria-invalid={wrong || undefined}
            aria-describedby={wrong ? errorId : undefined}
            onChange={(event) => {
              setTyped(event.target.value);
              setWrong(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                // In a letter's form, Enter would send it.
                event.preventDefault();
                save();
              } else if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
            }}
          />
        </span>
        <Button type="button" variant="primary" size="small" fit onClick={save}>
          {words.save}
        </Button>
        {current && (
          <Button
            type="button"
            variant="ghost"
            size="small"
            fit
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              onClose();
            }}
          >
            {words.remove}
          </Button>
        )}
        <Button type="button" variant="ghost" size="small" fit onClick={close}>
          {words.cancel}
        </Button>
      </div>
      {wrong && (
        <FieldError id={errorId} announce="status">
          {words.invalid}
        </FieldError>
      )}
    </div>
  );
}
