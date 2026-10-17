"use client";

// The volunteer tools' examples that need callbacks: client components with
// no props, so the server-rendered gallery can place them.
import QrScanner from "@/app/(tools)/tools/qr/_components/QrScanner";
import { Logged } from "../_components/wiring";

/** The scanner as it first shows: its buttons, the camera not yet asked for. A code it reads is logged. */
export function QrScannerExample() {
  return <Logged>{(log) => <QrScanner onResult={log("onResult")} />}</Logged>;
}
