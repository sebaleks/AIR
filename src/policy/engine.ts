import { ContextEvent } from "../context/types";
import { SalienceScore } from "../salience/engine";

export type PolicyAction =
  | "ignore"
  | "remember"
  | "suggest"
  | "ask_permission"
  | "execute_preapproved";

export class PolicyEngine {
  decide(event: ContextEvent, score: SalienceScore): PolicyAction {
    const preapproved = Boolean(event.payload["preapproved"]);

    if (score.privacy_risk >= 0.8) {
      return "ask_permission";
    }

    if (preapproved && score.urgency >= 0.7 && score.confidence >= 0.7) {
      return "execute_preapproved";
    }

    if (score.urgency >= 0.65 && score.user_value >= 0.7 && score.annoyance_cost <= 0.5) {
      return "suggest";
    }

    if (score.user_value >= 0.45 || score.confidence >= 0.6) {
      return "remember";
    }

    return "ignore";
  }
}
