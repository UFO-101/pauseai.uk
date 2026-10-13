import LocalGroupPage from "@/components/local-groups/LocalGroupPage";
import { localGroupMetadata, localGroupPages } from "@/lib/content/local-group-pages";

export const metadata = localGroupMetadata(
  "Glasgow",
  "/glasgow",
  "PauseAI Glasgow hosts events and conversations on AI risk in Scotland.",
);

export default function GlasgowPage() {
  return <LocalGroupPage content={localGroupPages["Glasgow"]} />;
}
