import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { eventsPage } from "@/lib/server/staff-events";
import { requireStaff } from "@/lib/server/staff-auth";
import { setEventDocNow, setEventOwnerNow } from "../../actions";
import EventsOverview, { EventsSource } from "../../_components/EventsOverview";

export const metadata: Metadata = { title: staffCopy.events.title };

export default async function EventsPage() {
  await requireStaff();
  return (
    <>
      <h1>{staffCopy.events.title}</h1>
      <EventsSource />
      <EventsOverview {...await eventsPage()} setOwner={setEventOwnerNow} setDoc={setEventDocNow} />
    </>
  );
}
