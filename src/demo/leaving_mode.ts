import { IngestContextEventInput } from "../context/types";

export function leavingModeEvents(nowIso: string): IngestContextEventInput[] {
  return [
    {
      kind: "departure_signal",
      source: "calendar",
      payload: { minutes_to_departure: 8, destination: "office", preapproved: false },
      confidence: 0.92,
      privacy_risk: 0.2,
      timestamp: nowIso
    },
    {
      kind: "departure_signal",
      source: "location",
      payload: { minutes_to_departure: 3, destination: "office", preapproved: true },
      confidence: 0.88,
      privacy_risk: 0.25,
      timestamp: nowIso
    }
  ];
}
