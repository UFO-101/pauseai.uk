import type { ReactNode } from "react";

/** One way a component looks: a label and the element that shows it. */
export type Variant = {
  label: string;
  render: () => ReactNode;
  /** An async server component, which only a page can render (not the browser test). */
  server?: boolean;
};

/** A component, by its export's name and the file it's in, and its variants. */
export type Example = {
  name: string;
  /** From the repo's root, e.g. "components/ui/Button.tsx". */
  file: string;
  variants: Variant[];
};

/** The examples of one folder, or of part of a big one: a storyboard flow each. */
export type Group = {
  /** Short, for anchors and the storyboard's flow name: "ui", "campaigns-letter". */
  id: string;
  title: string;
  examples: Example[];
};
