import type { Example, Group } from "./types";

/** The anchor of a component's section, or of one of its variants. */
export function anchor(group: string, name: string, label?: string): string {
  const slug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return [group, name, label]
    .filter(Boolean)
    .map((part) => slug(part!))
    .join("--");
}

/**
 * What names an example in its group's anchors: its component's name, or,
 * where two components in the group share one (two pages' Forewords), the
 * name and the folder its file is in.
 */
export function exampleKey(group: Group, example: Example): string {
  const shared = group.examples.filter((other) => other.name === example.name).length > 1;
  return shared ? `${example.name} ${example.file.split("/").at(-3)}` : example.name;
}
