import LocalGroupPage from "@/components/local-groups/LocalGroupPage";
import { localGroupMetadata, localGroupPages } from "@/lib/content/local-group-pages";

export const metadata = localGroupMetadata(
  "London",
  "/london",
  "Join PauseAI London for meetups, protests, and AI safety advocacy.",
);

export default function LondonPage() {
  return <LocalGroupPage content={localGroupPages["London"]} />;
}
