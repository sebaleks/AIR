import { ContextEvent } from "../context/types";

export type SalienceScore = {
  urgency: number;
  confidence: number;
  user_value: number;
  annoyance_cost: number;
  privacy_risk: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class SalienceEngine {
  score(event: ContextEvent): SalienceScore {
    const payloadMinutes = event.payload["minutes_to_departure"];
    const minutesToDeparture = typeof payloadMinutes === "number" ? payloadMinutes : 30;

    const urgency = clamp01(1 - minutesToDeparture / 60);
    const confidence = clamp01(event.confidence ?? 0.5);
    const privacy_risk = clamp01(event.privacy_risk ?? 0.3);

    const userValueBase = event.kind === "departure_signal" ? 0.8 : 0.5;
    const user_value = clamp01(userValueBase * 0.7 + urgency * 0.3);

    const annoyance_cost = clamp01((1 - urgency) * 0.4 + (1 - confidence) * 0.4 + 0.2);

    return {
      urgency,
      confidence,
      user_value,
      annoyance_cost,
      privacy_risk
    };
  }
}
