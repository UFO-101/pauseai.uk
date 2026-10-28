"use client";

import { EditorContent, Node, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import { useMemo, useRef, useState } from "react";
import { letterExtensions } from "@/lib/letter-extensions";
import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingChoice } from "@/lib/mailing-fields";
import styles from "./MailingEditor.module.css";

const copy = staffCopy.mailingEditor;

type Props = {
  initial: JSONContent;
  onChange: (doc: JSONContent) => void;
  /** The merge fields it offers; those some recipients lack a value for, ghosted. */
  fields: MailingChoice[];
  /** Who a part can be only for, such as those who signed an ask, each with how many it covers. */
  conditions: MailingChoice[];
  /** The ID of the label naming it. */
  labelledBy: string;
};

/** Whether every recipient has a value for a field, so it can be used. */
const usable = (field: MailingChoice) => !field.lacking;

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

/** Bold, italic and bullets, and in a part for only some, the button that makes it for everyone. */
function Toolbar({ editor }: { editor: Editor }) {
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
    <div className={styles.toolbar} role="toolbar" aria-label={copy.formatting}>
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
      {active.onlyFor && (
        <button type="button" onClick={() => editor.chain().focus().lift("onlyFor").run()}>
          {copy.forEveryone}
        </button>
      )}
    </div>
  );
}

/**
 * The lozenges beside the letter, to click or drag in: the merge fields,
 * those some recipients lack a value for ghosted, saying how many; then who
 * a part can be only for, each with how many it covers. Clicking one of
 * those puts the paragraphs at the cursor in a box for them, or changes who
 * the box the cursor is in is for.
 */
function Sidebar({
  editor,
  fields,
  conditions,
}: {
  editor: Editor;
  fields: MailingChoice[];
  conditions: MailingChoice[];
}) {
  const inBox = useEditorState({ editor, selector: ({ editor }) => editor.isActive("onlyFor") });
  return (
    <div className={styles.sidebar}>
      <p className={styles.sideHeading}>{copy.fieldsHeading}</p>
      <ul className={styles.lozenges}>
        {fields.map((field) => (
          <li key={field.id}>
            <button
              type="button"
              className={styles.fieldLozenge}
              aria-disabled={!usable(field) || undefined}
              title={usable(field) ? copy.dragHint : copy.lacking(field.lacking!)}
              draggable={usable(field)}
              // So the letter keeps its cursor, and Space goes to it, not this.
              onMouseDown={(event) => event.preventDefault()}
              onDragStart={(event) =>
                event.dataTransfer.setData("text/html", `<span data-field="${field.id}">${field.label}</span>`)
              }
              onClick={() =>
                usable(field) &&
                editor
                  .chain()
                  .focus()
                  .insertContent({ type: "field", attrs: { field: field.id } })
                  .run()
              }
            >
              {field.label}
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.sideHeading}>{copy.onlyFor}</p>
      {conditions.length === 0 && <p className={styles.sideNote}>{copy.noConditions}</p>}
      <ul className={styles.lozenges}>
        {conditions.map((condition) => (
          <li key={condition.id}>
            <button
              type="button"
              className={styles.conditionLozenge}
              title={copy.dragHint}
              draggable
              onMouseDown={(event) => event.preventDefault()}
              onDragStart={(event) =>
                event.dataTransfer.setData(
                  "text/html",
                  `<div data-condition="${condition.id}"><div data-body><p></p></div></div>`,
                )
              }
              onClick={() =>
                inBox
                  ? editor.chain().focus().updateAttributes("onlyFor", { condition: condition.id }).run()
                  : editor.chain().focus().wrapIn("onlyFor", { condition: condition.id }).run()
              }
            >
              {condition.label}
              <span className={styles.covers}>{copy.covers(condition.covers ?? 0)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A mailing's letter: bold, italic and bullets as in a supporter's letter,
 * merge fields as chips, and parts in a box that only some recipients get,
 * with the fields and who a part can be for beside it. Typing { offers the
 * fields every recipient has at the cursor.
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
        if (text !== "{" || !fields.some(usable)) return false;
        const at = view.coordsAtPos(from);
        const box = frame.current!.getBoundingClientRect();
        setPicker({ from, to, top: at.bottom - box.top, left: at.left - box.left });
        return true;
      },
    },
    // As plain JSON: ProseMirror's attributes are objects with no prototype,
    // which a Server Action's arguments leave out.
    onUpdate: ({ editor }) => onChange(JSON.parse(JSON.stringify(editor.getJSON()))),
  });

  function close() {
    setPicker(undefined);
    editor!.commands.focus();
  }

  return (
    <div className={styles.layout}>
      <div className={styles.editorFrame} ref={frame}>
        {editor && <Toolbar editor={editor} />}
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
            {fields.filter(usable).map((field, i) => (
              <button
                key={field.id}
                type="button"
                role="menuitem"
                autoFocus={i === 0}
                onClick={() => {
                  editor!
                    .chain()
                    .insertContentAt(
                      { from: picker.from, to: picker.to },
                      { type: "field", attrs: { field: field.id } },
                    )
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
      {editor && <Sidebar editor={editor} fields={fields} conditions={conditions} />}
    </div>
  );
}
