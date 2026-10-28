import { dropDatabase } from "@/scripts/fresh-database.mjs";
import { TEMPLATE_DATABASE } from "../checkout.mjs";

export default function globalTeardown(): void {
  dropDatabase(TEMPLATE_DATABASE);
}
