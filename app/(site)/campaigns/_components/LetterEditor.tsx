"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { useState } from "react";
import LinkBar from "@/components/ui/LinkBar";
import { copy } from "@/lib/content/email-your-mp";
import { isLinkKey, letterExtensions } from "@/lib/letter-extensions";
import type { LetterDoc } from "@/lib/letter-format";
import styles from "./LetterEditor.module.css";

type Props = {
  initial: LetterDoc;
  onChange: (doc: LetterDoc) => void;
  /** The ID of the label naming it. */
  labelledBy: string;
  describedBy: string;
};

/** Bold, italic, links, bullet points and quotes: the formatting a letter may have (lib/letter-format.ts). Link opens the link bar under it. */
function Toolbar({ editor, labelledBy, onLink }: { editor: Editor; labelledBy: string; onLink: () => void }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      link: editor.isActive("link"),
      bulletList: editor.isActive("bulletList"),
      blockquote: editor.isActive("blockquote"),
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
    { title: copy.editor.link, label: copy.editor.linkLabel, pressed: active.link, run: onLink },
    {
      title: "Bullet point",
      label: "• List",
      pressed: active.bulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: copy.editor.quote,
      label: copy.editor.quoteLabel,
      pressed: active.blockquote,
      run: () => editor.chain().focus().toggleBlockquote().run(),
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

/** The letter, with bold, italic, links, bullets and quotes, and no preview: what you see is what's sent. */
export default function LetterEditor({ initial, onChange, labelledBy, describedBy }: Props) {
  const [linking, setLinking] = useState(false);
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
      handleKeyDown: (_, event) => {
        if (!isLinkKey(event)) return false;
        setLinking(true);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as LetterDoc),
  });
  return (
    <div className={styles.editorFrame}>
      {editor && <Toolbar editor={editor} labelledBy={labelledBy} onLink={() => setLinking(true)} />}
      {editor && linking && <LinkBar editor={editor} words={copy.editor.linkBar} onClose={() => setLinking(false)} />}
      <EditorContent editor={editor} />
    </div>
  );
}
