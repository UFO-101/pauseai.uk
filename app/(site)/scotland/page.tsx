import LocalGroupPage from "@/components/local-groups/LocalGroupPage";
import { localGroupMetadata, localGroupPages } from "@/lib/content/local-group-pages";

export const metadata = localGroupMetadata(
  "Scotland",
  "/scotland",
  "PauseAI Scotland hosts events and conversations on AI risk.",
);

export default function ScotlandPage() {
  return <LocalGroupPage content={localGroupPages["Scotland"]} />;
}
