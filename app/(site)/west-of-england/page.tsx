import LocalGroupPage from "@/components/local-groups/LocalGroupPage";
import { localGroupMetadata, localGroupPages } from "@/lib/content/local-group-pages";

export const metadata = localGroupMetadata(
  "West of England",
  "/west-of-england",
  "Join the West of England group of PauseAI for meetups, outreach, and AI safety action around Bristol and the wider region.",
);

export default function WestOfEnglandPage() {
  return <LocalGroupPage content={localGroupPages["West of England"]} />;
}
