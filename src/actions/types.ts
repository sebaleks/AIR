import { PolicyAction } from "../policy/engine";
import { SalienceScore } from "../salience/engine";

export type EventDecision = {
  eventId: string;
  action: PolicyAction;
  score: SalienceScore;
  timestamp: string;
};
