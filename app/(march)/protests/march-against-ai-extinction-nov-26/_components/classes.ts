import styles from "./march.module.css";

/**
 * The march stylesheet's classes for a space-separated list of its class
 * names: m("btn large on-ink"). Throws on a name the stylesheet hasn't got, so
 * a typo fails the component's test instead of quietly dropping a style.
 */
export function m(names: string): string {
  return names
    .split(" ")
    .map((name) => {
      const local = styles[name];
      if (!local) throw new Error(`march.module.css has no class "${name}"`);
      return local;
    })
    .join(" ");
}
