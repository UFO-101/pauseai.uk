"use client";

// The home page's examples that call back: the choice of where to see events near.
import EventsPlacePicker from "@/app/(site)/_components/EventsPlacePicker";
import { ANYWHERE } from "@/lib/events";
import { Logged } from "../_components/wiring";

export function EventsPlacePickerExample({ group }: { group?: "London" }) {
  return (
    <Logged>
      {(log) => (
        <div className="container">
          <EventsPlacePicker where={group ? { kind: "group", name: group } : ANYWHERE} onChoose={log("onChoose")} />
        </div>
      )}
    </Logged>
  );
}
