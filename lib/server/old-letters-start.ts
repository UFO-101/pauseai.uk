import "server-only";
import { importOldLetters } from "./old-letters-import";
import { startBackgroundFunction } from "./outside-services/netlify-functions";

/**
 * Starts a press of the import of old letters: a background function with up
 * to 15 minutes, or in a fixture build, which has none, the whole of it now.
 */
export async function startOldLettersImport(startedBy: string, dryRun: boolean): Promise<void> {
  if (process.env.DATA_FIXTURES === "1") {
    await importOldLetters(startedBy, dryRun);
    return;
  }
  await startBackgroundFunction("import-old-letters-background", { startedBy, dryRun });
}
