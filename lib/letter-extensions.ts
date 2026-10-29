import StarterKit from "@tiptap/starter-kit";

// The letter editors' Tiptap extensions: only what a letter may have
// (lib/letter-format.ts), paragraphs, bold, italic and bullet lists. Anything
// else pasted in becomes plain paragraphs. A mailing's editor adds merge
// fields and parts for only some to these.
export const letterExtensions = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    heading: false,
    horizontalRule: false,
    link: false,
    orderedList: false,
    strike: false,
    underline: false,
    // It keeps an empty paragraph at the end, which would be sent.
    trailingNode: false,
  }),
];
