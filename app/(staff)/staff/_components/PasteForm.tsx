"use client";

import { TextArea } from "@/components/ui/Controls";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";

const copy = staffCopy.mailingPages;

/**
 * The box for names to paste, one a line, and Find these, which sends
 * them, with `back` the list to show them on. It's typed into at once when
 * its bubble opens, as a popover focuses what's marked autofocus, and
 * Ctrl+Enter, or Cmd+Enter on a Mac, sends it, as Enter is a new line.
 */
export default function PasteForm({
  action,
  back,
  className,
}: {
  action: (form: FormData) => void | Promise<void>;
  back: string;
  className?: string;
}) {
  return (
    <form action={action} className={className}>
      <input type="hidden" name="back" value={back} />
      <TextArea
        name="names"
        rows={8}
        required
        autoFocus
        aria-label={copy.pasteLabel}
        placeholder={copy.pasteLabel}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            event.currentTarget.form!.requestSubmit();
          }
        }}
      />
      <SubmitButton variant="primary" size="small" fit>
        {copy.pasteTick}
      </SubmitButton>
    </form>
  );
}
