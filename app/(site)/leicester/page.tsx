import LocalGroupPage from "@/components/local-groups/LocalGroupPage";
import { localGroupMetadata, localGroupPages } from "@/lib/content/local-group-pages";

export const metadata = localGroupMetadata(
  "Leicester",
  "/leicester",
  "Join the Leicester group of PauseAI for meetups, outreach, and AI safety action.",
);

export default function LeicesterPage() {
  return <LocalGroupPage content={localGroupPages["Leicester"]} />;
}
