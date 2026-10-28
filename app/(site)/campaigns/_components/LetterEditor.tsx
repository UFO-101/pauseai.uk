"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { letterExtensions } from "@/lib/letter-extensions";
import type { LetterDoc } from "@/lib/letter-format";
import styles from "./LetterEditor.module.css";

type Props = {
  initial: LetterDoc;
  onChange: (doc: LetterDoc) => void;
  /** The ID of the label naming it. */
  labelledBy: string;
  describedBy: string;
};

/** Bold, italic and bullet points: the formatting a letter may have (lib/letter-format.ts). */
function Toolbar({ editor, labelledBy }: { editor: Editor; labelledBy: string }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      bulletList: editor.isActive("bulletList"),
    }),
  });
  const buttons = [
    {
      title: "Bold",
      label: <strong>B</strong>,
      pressed: active.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      title: "Italic",
      label: <em>i</em>,
      pressed: active.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      title: "Bullet point",
      label: "• List",
      pressed: active.bulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
  ];
  return (
    <div className={styles.toolbar} role="toolbar" aria-labelledby={labelledBy}>
      {buttons.map((button) => (
        <button
          key={button.title}
          type="button"
          title={button.title}
          aria-label={button.title}
          aria-pressed={button.pressed}
          onClick={button.run}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}

/** The letter, with bold, italic and bullets, and no preview: what you see is what's sent. */
export default function LetterEditor({ initial, onChange, labelledBy, describedBy }: Props) {
  const editor = useEditor({
    extensions: letterExtensions,
    content: initial,
    // Rendered on the server too, where there's no editor yet.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
        "aria-describedby": describedBy,
        class: styles.editor,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as LetterDoc),
  });
  return (
    <div className={styles.editorFrame}>
      {editor && <Toolbar editor={editor} labelledBy={labelledBy} />}
      <EditorContent editor={editor} />
    </div>
  );
}
