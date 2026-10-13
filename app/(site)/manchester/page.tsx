import LocalGroupPage from "@/components/local-groups/LocalGroupPage";
import { localGroupMetadata, localGroupPages } from "@/lib/content/local-group-pages";

export const metadata = localGroupMetadata(
  "Manchester",
  "/manchester",
  "Join the Manchester group of PauseAI for meetups, outreach, and AI safety action.",
);

export default function ManchesterPage() {
  return <LocalGroupPage content={localGroupPages["Manchester"]} />;
}
