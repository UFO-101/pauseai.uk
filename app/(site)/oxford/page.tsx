import LocalGroupPage from "@/components/local-groups/LocalGroupPage";
import { localGroupMetadata, localGroupPages } from "@/lib/content/local-group-pages";

export const metadata = localGroupMetadata(
  "Oxford",
  "/oxford",
  "PauseAI Oxford links students, researchers, and locals to discuss and act on AI safety.",
);

export default function OxfordPage() {
  return <LocalGroupPage content={localGroupPages["Oxford"]} />;
}
