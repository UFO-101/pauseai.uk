import { dropDatabase } from "@/scripts/fresh-database.mjs";
import { TEMPLATE_DATABASE } from "../fixture-env.mjs";

export default function globalTeardown(): void {
  dropDatabase(TEMPLATE_DATABASE);
}
