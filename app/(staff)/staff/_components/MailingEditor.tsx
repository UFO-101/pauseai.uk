"use client";

import { EditorContent, Node, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import { useMemo, useRef, useState } from "react";
import { letterExtensions } from "@/lib/letter-extensions";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./MailingEditor.module.css";

const copy = staffCopy.mailingEditor;

/** Something the editor offers by its ID, shown by its label: a merge field, or who a part is for. */
export type Choice = { id: string; label: string };

type Props = {
  initial: JSONContent;
  onChange: (doc: JSONContent) => void;
  /** The merge fields it offers. */
  fields: Choice[];
  /** Who a part can be only for, such as those who signed an ask. */
  conditions: Choice[];
  /** The ID of the label naming it. */
  labelledBy: string;
};

/** A choice's label, or its ID when it has none, as for a field no longer offered. */
function labelOf(choices: Record<string, string>, id: string): string {
  return choices[id] ?? id;
}

// A merge field: a chip in the text, filled in for each recipient. It's one
// piece, so it's deleted, copied and dragged whole and can't be half-edited.
const MergeField = Node.create<{ labels: Record<string, string> }>({
  name: "field",
  group: "inline",
  inline: true,
  atom: true,
  draggable: true,
  addOptions: () => ({ labels: {} }),
  addAttributes: () => ({
    field: {
      default: "",
      parseHTML: (element) => element.getAttribute("data-field"),
      renderHTML: (attributes) => ({ "data-field": attributes.field }),
    },
  }),
  parseHTML: () => [{ tag: "span[data-field]" }],
  renderHTML({ node, HTMLAttributes }) {
    return ["span", { ...HTMLAttributes, class: styles.field }, labelOf(this.options.labels, node.attrs.field)];
  },
  renderText({ node }) {
    return labelOf(this.options.labels, node.attrs.field);
  },
});

// A part only some recipients get: paragraphs or a list in a box, with who
// it's for on the box. Enter on an empty last line takes it out of the box,
// as ProseMirror does for any such box. So does Backspace at the box's start:
// left to ProseMirror, it would join the box to one just before it, and its
// text would quietly go to that box's recipients instead.
const OnlyFor = Node.create<{ labels: Record<string, string> }>({
  name: "onlyFor",
  group: "block",
  content: "(paragraph | bulletList)+",
  defining: true,
  addOptions: () => ({ labels: {} }),
  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        const box = $from.depth - 1;
        if (!empty || $from.parentOffset > 0 || $from.node(box).type.name !== this.name || $from.index(box) > 0)
          return false;
        return editor.commands.lift(this.name);
      },
    };
  },
  addAttributes: () => ({
    condition: {
      default: "",
      parseHTML: (element) => element.getAttribute("data-condition"),
      renderHTML: (attributes) => ({ "data-condition": attributes.condition }),
    },
  }),
  parseHTML: () => [{ tag: "div[data-condition]", contentElement: "div[data-body]" }],
  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      { ...HTMLAttributes, class: styles.onlyFor },
      [
        "p",
        { class: styles.onlyForLabel, contenteditable: "false" },
        copy.onlyForLabel(labelOf(this.options.labels, node.attrs.condition)),
      ],
      ["div", { "data-body": "" }, 0],
    ];
  },
});

/** Bold, italic and bullets, a button for each merge field, and who a part is for. */
function Toolbar({ editor, fields, conditions }: { editor: Editor; fields: Choice[]; conditions: Choice[] }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      bulletList: editor.isActive("bulletList"),
      onlyFor: editor.isActive("onlyFor"),
    }),
  });
  const marks = [
    {
      title: copy.bold,
      label: <strong>B</strong>,
      pressed: active.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      title: copy.italic,
      label: <em>i</em>,
      pressed: active.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      title: copy.bulletList,
      label: "• List",
      pressed: active.bulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
  ];
  return (
    <div className={styles.toolbar} role="toolbar" aria-label={copy.insert}>
      {marks.map((mark) => (
        <button
          key={mark.title}
          type="button"
          title={mark.title}
          aria-label={mark.title}
          aria-pressed={mark.pressed}
          onClick={mark.run}
        >
          {mark.label}
        </button>
      ))}
      <span className={styles.insert}>{copy.insert}</span>
      {fields.map((field) => (
        <button
          key={field.id}
          type="button"
          className={styles.fieldButton}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertContent({ type: "field", attrs: { field: field.id } })
              .run()
          }
        >
          {field.label}
        </button>
      ))}
      {active.onlyFor ? (
        <button type="button" onClick={() => editor.chain().focus().lift("onlyFor").run()}>
          {copy.forEveryone}
        </button>
      ) : (
        <select
          aria-label={copy.onlyFor}
          value=""
          onChange={(event) => editor.chain().focus().wrapIn("onlyFor", { condition: event.target.value }).run()}
        >
          <option value="" disabled>
            {copy.onlyFor}
          </option>
          {conditions.map((condition) => (
            <option key={condition.id} value={condition.id}>
              {condition.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/**
 * A mailing's letter: bold, italic and bullets as in a supporter's letter,
 * merge fields as chips, and parts in a box that only some recipients get.
 * Typing { offers the fields at the cursor.
 */
export default function MailingEditor({ initial, onChange, fields, conditions, labelledBy }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  // Where the { was typed, and where to show the menu of fields.
  const [picker, setPicker] = useState<{ from: number; to: number; top: number; left: number }>();
  const extensions = useMemo(
    () => [
      ...letterExtensions,
      MergeField.configure({ labels: Object.fromEntries(fields.map((field) => [field.id, field.label])) }),
      OnlyFor.configure({ labels: Object.fromEntries(conditions.map((condition) => [condition.id, condition.label])) }),
    ],
    [fields, conditions],
  );
  const editor = useEditor({
    extensions,
    content: initial,
    // Rendered on the server too, where there's no editor yet.
    immediatelyRender: false,
    editorProps: {
      attributes: { role: "textbox", "aria-multiline": "true", "aria-labelledby": labelledBy, class: styles.editor },
      handleTextInput: (view, from, to, text) => {
        if (text !== "{") return false;
        const at = view.coordsAtPos(from);
        const box = frame.current!.getBoundingClientRect();
        setPicker({ from, to, top: at.bottom - box.top, left: at.left - box.left });
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  function close() {
    setPicker(undefined);
    editor!.commands.focus();
  }

  return (
    <div className={styles.editorFrame} ref={frame}>
      {editor && <Toolbar editor={editor} fields={fields} conditions={conditions} />}
      <EditorContent editor={editor} />
      {picker && (
        <div
          className={styles.picker}
          role="menu"
          aria-label={copy.pickField}
          style={{ top: picker.top, left: picker.left }}
          onKeyDown={(event) => {
            if (event.key === "Escape") return close();
            const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
            if (!step) return;
            event.preventDefault();
            const items = [...event.currentTarget.querySelectorAll("button")];
            const at = items.indexOf(document.activeElement as HTMLButtonElement);
            items[(at + step + items.length) % items.length].focus();
          }}
        >
          {fields.map((field, i) => (
            <button
              key={field.id}
              type="button"
              role="menuitem"
              autoFocus={i === 0}
              onClick={() => {
                editor!
                  .chain()
                  .insertContentAt({ from: picker.from, to: picker.to }, { type: "field", attrs: { field: field.id } })
                  .run();
                close();
              }}
            >
              {field.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
