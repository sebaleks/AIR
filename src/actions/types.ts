import type { PolicyAction } from "../policy/engine.ts";
import type { SalienceScore } from "../salience/engine.ts";

export type EventDecision = {
  eventId: string;
  action: PolicyAction;
  score: SalienceScore;
  timestamp: string;
};
