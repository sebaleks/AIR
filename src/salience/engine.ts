import type { ContextEvent } from "../context/types.ts";

export type SalienceScore = {
  urgency: number;
  confidence: number;
  user_value: number;
  annoyance_cost: number;
  privacy_risk: number;
  reversibility: number;
};

export type SalienceComposite = {
  components: SalienceScore;
  total: number;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * AIR-024 source-of-truth formula (docs/policy-rules.md §2)
 */
export function compositeSalienceScore(components: SalienceScore): number {
  const total =
    0.35 * components.urgency +
    0.25 * components.confidence +
    0.2 * components.user_value +
    0.1 * components.reversibility -
    0.25 * components.annoyance_cost -
    0.3 * components.privacy_risk;

  return clamp01(total);
}

export function createSalienceComposite(components: SalienceScore): SalienceComposite {
  return {
    components,
    total: compositeSalienceScore(components),
  };
}

/**
 * Lightweight event-to-component mapping.
 * Composite scoring is the normative behavior in AIR-024.
 */
export function scoreEventSalience(event: ContextEvent): SalienceComposite {
  const minutesToDeparture = Number(event.payload.minutes_to_departure ?? 60);
  const urgency = clamp01(1 - minutesToDeparture / 60);

  const confidence = clamp01(
    typeof event.confidence === "number" ? event.confidence : Number(event.payload.confidence ?? 0.5),
  );

  const userValue = clamp01(Number(event.payload.user_value ?? 0.5));
  const annoyanceCost = clamp01(Number(event.payload.annoyance_cost ?? 0.25));
  const privacyRisk = clamp01(
    typeof event.privacy_risk === "number" ? event.privacy_risk : Number(event.payload.privacy_risk ?? 0.2),
  );
  const reversibility = clamp01(Number(event.payload.reversibility ?? 1));

  return createSalienceComposite({
    urgency,
    confidence,
    user_value: userValue,
    annoyance_cost: annoyanceCost,
    privacy_risk: privacyRisk,
    reversibility,
  });
}
