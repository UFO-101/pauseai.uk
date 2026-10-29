import Blockquote from "@tiptap/extension-blockquote";
import { Fragment, Slice, type Node } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { linkHref } from "./letter-format";

// The letter editors' Tiptap extensions: only what a letter may have
// (lib/letter-format.ts), paragraphs, bold, italic, links, bullet lists and
// quotes. Anything else pasted in becomes plain paragraphs. A mailing's
// editor adds merge fields and parts for only some to these.

/** Whether a paragraph has nothing in it. */
const isEmptyParagraph = (node: Node) => node.type.name === "paragraph" && node.content.size === 0;

/**
 * Paragraphs are already spaced apart, so an empty one between two would
 * show as a gap twice the size, which the email wouldn't have: an empty
 * paragraph there takes no room. So Enter on an empty line of the letter,
 * or at the start of a line after one, does nothing, and empty paragraphs
 * pasted in are left out. In a list, a quote or a part for only some,
 * Enter on an empty last line still takes it out of the box.
 */
const NoBlankLines = Extension.create({
  name: "noBlankLines",
  // Before the paragraph's own Enter, which would split it.
  priority: 1000,
  addKeyboardShortcuts: () => ({
    Enter: ({ editor }) => {
      const { $from, empty } = editor.state.selection;
      if (!empty || $from.depth !== 1 || $from.parentOffset > 0) return false;
      const before = $from.index(0) > 0 ? $from.node(0).child($from.index(0) - 1) : undefined;
      return isEmptyParagraph($from.parent) || (before !== undefined && isEmptyParagraph(before));
    },
  }),
  addProseMirrorPlugins: () => [
    new Plugin({
      props: {
        transformPasted: (slice) => {
          const last = slice.content.childCount - 1;
          const kept: Node[] = [];
          // Only whole paragraphs: an open one at either end is part of the line it's pasted into.
          slice.content.forEach((node, _, i) => {
            const whole = (i > 0 || slice.openStart === 0) && (i < last || slice.openEnd === 0);
            if (!whole || !isEmptyParagraph(node)) kept.push(node);
          });
          return new Slice(Fragment.fromArray(kept), slice.openStart, slice.openEnd);
        },
      },
    }),
  ],
});

/** Ctrl+K, or Cmd+K on a Mac: what opens an editor's link bar. */
export function isLinkKey(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k";
}

export const letterExtensions = [
  StarterKit.configure({
    // Its own allows anything in a quote; a letter's holds only paragraphs and lists.
    blockquote: false,
    code: false,
    codeBlock: false,
    heading: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: "https",
      isAllowedUri: (url) => linkHref(url) !== undefined,
    },
    orderedList: false,
    strike: false,
    underline: false,
    // It keeps an empty paragraph at the end, which would be sent.
    trailingNode: false,
  }),
  Blockquote.extend({ content: "(paragraph | bulletList)+" }),
  NoBlankLines,
];
