// Once, before the node project's test files: the migrated database each
// file that needs one copies (useTestDatabase in tests/database.ts), as the
// storyboard's flows copy theirs. Copying takes tens of milliseconds; running
// every migration in each file at once, while the others do the same, took
// over the 10s a hook gets on a loaded CI runner.
import type { TestProject } from "vitest/node";
import { dropDatabase, freshDatabase } from "@/scripts/fresh-database.mjs";

declare module "vitest" {
  export interface ProvidedContext {
    templateDatabase: string;
  }
}

export default function setup(project: TestProject) {
  // Netlify's build runs the unit tests with no Postgres (describeWithDatabase).
  if (process.env.NETLIFY === "true") return;
  const name = `test_template_${process.pid}`;
  freshDatabase(name);
  project.provide("templateDatabase", name);
  return () => dropDatabase(name);
}
