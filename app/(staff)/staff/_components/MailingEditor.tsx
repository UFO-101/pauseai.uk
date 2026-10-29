"use client";

import { EditorContent, Node, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import { useId, useMemo, useRef, useState } from "react";
import LinkBar from "@/components/ui/LinkBar";
import { isLinkKey, letterExtensions } from "@/lib/letter-extensions";
import { staffCopy } from "@/lib/content/staff-interface";
import { NOT_CONDITION } from "@/lib/mailing-doc";
import { partFor, type MailingChoice } from "@/lib/mailing-fields";
import NotIcon from "./ui/NotIcon";
import styles from "./MailingEditor.module.css";

const copy = staffCopy.mailingEditor;

type Props = {
  initial: JSONContent;
  onChange: (doc: JSONContent) => void;
  /** The merge fields it offers; those some recipients lack a value for, ghosted. */
  fields: MailingChoice[];
  /** Who a part can be only for, such as those who signed an ask, each with how many it covers. */
  conditions: MailingChoice[];
  /** How many recipients there are, to say how many all but some is. */
  recipients?: number;
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

// A part only some recipients get: paragraphs, lists or quotes in a box, with who
// it's for on the box. Enter on an empty last line takes it out of the box,
// as ProseMirror does for any such box. So does Backspace at the box's start:
// left to ProseMirror, it would join the box to one just before it, and its
// text would quietly go to that box's recipients instead.
const OnlyFor = Node.create<{ labels: Record<string, string> }>({
  name: "onlyFor",
  group: "block",
  content: "(paragraph | bulletList | blockquote)+",
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
      {
        ...HTMLAttributes,
        class: styles.onlyFor,
        "data-except": node.attrs.condition.startsWith(NOT_CONDITION) ? "" : undefined,
      },
      [
        "p",
        { class: styles.onlyForLabel, contenteditable: "false" },
        partFor(node.attrs.condition, this.options.labels),
      ],
      ["div", { "data-body": "" }, 0],
    ];
  },
});

/**
 * Bold, italic, links, bullets and quotes, and in a part for only some, the
 * button that makes it for everyone. Link opens the link bar under it.
 */
function Toolbar({ editor, onLink }: { editor: Editor; onLink: () => void }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      link: editor.isActive("link"),
      bulletList: editor.isActive("bulletList"),
      blockquote: editor.isActive("blockquote"),
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
    { title: copy.link, label: copy.linkLabel, pressed: active.link, run: onLink },
    {
      title: copy.bulletList,
      label: "• List",
      pressed: active.bulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: copy.quote,
      label: copy.quoteLabel,
      pressed: active.blockquote,
      run: () => editor.chain().focus().toggleBlockquote().run(),
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
 * "+ Only for those who…", or "Except those who…": a button that opens the
 * asks, as the filter bar's Answer does, then the answers to the one
 * chosen, each with how many recipients it takes in. Choosing one puts the
 * paragraphs at the cursor in a box for them, or changes who the box the
 * cursor is in is for.
 */
function ConditionMenu({
  not,
  conditions,
  recipients,
  choose,
}: {
  not: boolean;
  conditions: MailingChoice[];
  recipients?: number;
  choose: (condition: string) => void;
}) {
  const id = `${useId().replace(/:/g, "")}-${not ? "except" : "only"}`;
  // The ask chosen, whose answers the menu now offers; none for the list of asks.
  const [ask, setAsk] = useState<string>();
  const menu = useRef<HTMLDivElement>(null);
  const asks = [...new Set(conditions.map((condition) => condition.group!))];
  // So the letter keeps its cursor while the menu is used.
  const keep = (event: React.MouseEvent) => event.preventDefault();
  return (
    <>
      <button
        type="button"
        className={not ? styles.exceptButton : styles.onlyButton}
        popoverTarget={id}
        onMouseDown={keep}
        style={{ anchorName: `--${id}` } as React.CSSProperties}
      >
        {not && <NotIcon />}
        {not ? copy.except : copy.addOnlyFor}
      </button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        className={styles.partMenu}
        role="menu"
        aria-label={not ? copy.except : copy.addOnlyFor}
        style={{ positionAnchor: `--${id}` } as React.CSSProperties}
      >
        {ask === undefined ? (
          <ul>
            {asks.map((group) => (
              <li key={group}>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.toAsk}
                  onMouseDown={keep}
                  onClick={() => setAsk(group)}
                >
                  {group}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <button type="button" className={styles.back} onMouseDown={keep} onClick={() => setAsk(undefined)}>
              {copy.backToAsks}
            </button>
            <p className={styles.askTitle}>{ask}</p>
            <ul>
              {conditions
                .filter((condition) => condition.group === ask)
                .map((condition) => {
                  const n = not && recipients !== undefined ? recipients - condition.covers! : condition.covers!;
                  return (
                    <li key={condition.id}>
                      <button
                        type="button"
                        role="menuitem"
                        onMouseDown={keep}
                        onClick={() => {
                          // Not popoverTargetAction: by then the asks have replaced this button.
                          menu.current?.hidePopover();
                          setAsk(undefined);
                          choose(`${not ? NOT_CONDITION : ""}${condition.id}`);
                        }}
                      >
                        {condition.option}
                        <span className={styles.covers}>{copy.covers(n)}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

/**
 * Beside the letter: the merge fields as lozenges, to click or drag in,
 * those some recipients lack a value for ghosted, saying how many; then the
 * menus of who a part can be only for, or for all but.
 */
function Sidebar({
  editor,
  fields,
  conditions,
  recipients,
}: {
  editor: Editor;
  fields: MailingChoice[];
  conditions: MailingChoice[];
  recipients?: number;
}) {
  const inBox = useEditorState({ editor, selector: ({ editor }) => editor.isActive("onlyFor") });
  const insert = (field: MailingChoice) =>
    usable(field) &&
    editor
      .chain()
      .focus()
      .insertContent({ type: "field", attrs: { field: field.id } })
      .run();
  return (
    <div className={styles.sidebar}>
      <p className={styles.sideHeading}>{copy.fieldsHeading}</p>
      <ul className={styles.lozenges}>
        {fields.map((field) => (
          <li key={field.id}>
            {/* Not a <button>, which Firefox won't drag: a button's role, focus and keys. */}
            <span
              role="button"
              tabIndex={0}
              className={styles.fieldLozenge}
              aria-disabled={!usable(field) || undefined}
              title={usable(field) ? copy.dragHint : copy.lacking(field.lacking!)}
              draggable={usable(field)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData("text/html", `<span data-field="${field.id}">${field.label}</span>`);
                event.dataTransfer.setData("text/plain", field.label);
              }}
              onClick={() => insert(field)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                insert(field);
              }}
            >
              {field.label}
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.sideHeading}>{copy.partsHeading}</p>
      {conditions.length === 0 ? (
        <p className={styles.sideNote}>{copy.noConditions}</p>
      ) : (
        <div className={styles.partMenus}>
          {([false, true] as const).map((not) => (
            <ConditionMenu
              key={String(not)}
              not={not}
              conditions={conditions}
              recipients={recipients}
              choose={(condition) =>
                inBox
                  ? editor.chain().focus().updateAttributes("onlyFor", { condition }).run()
                  : editor.chain().focus().wrapIn("onlyFor", { condition }).run()
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A mailing's letter: bold, italic, links, bullets and quotes as in a supporter's letter,
 * merge fields as chips, and parts in a box that only some recipients get,
 * with the fields and who a part can be for beside it. Typing { offers the
 * fields every recipient has at the cursor.
 */
export default function MailingEditor({ initial, onChange, fields, conditions, recipients, labelledBy }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  // Where the { was typed, and where to show the menu of fields.
  const [picker, setPicker] = useState<{ from: number; to: number; top: number; left: number }>();
  const [linking, setLinking] = useState(false);
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
      handleKeyDown: (_, event) => {
        if (!isLinkKey(event)) return false;
        setLinking(true);
        return true;
      },
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
        {editor && <Toolbar editor={editor} onLink={() => setLinking(true)} />}
        {editor && linking && <LinkBar editor={editor} words={copy.linkBar} onClose={() => setLinking(false)} />}
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
      {editor && <Sidebar editor={editor} fields={fields} conditions={conditions} recipients={recipients} />}
    </div>
  );
}
