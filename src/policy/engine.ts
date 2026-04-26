import type { ContextEvent } from "../context/types.ts";
import type { SalienceComposite, SalienceScore } from "../salience/engine.ts";

export type PolicyAction =
  | "ignore"
  | "remember"
  | "suggest"
  | "ask_permission"
  | "execute_preapproved";

export type ReasonCode =
  | "score_below_ignore_threshold"
  | "score_in_remember_band"
  | "score_in_suggest_band"
  | "score_in_ask_band"
  | "score_in_preapproved_band"
  | "cooldown_active"
  | "policy_pre_approved"
  | "policy_consent_required"
  | "privacy_risk_too_high";

export type PolicyDecision = {
  action: PolicyAction;
  reason: ReasonCode;
  cooldown_state: CooldownState;
};

export type CooldownState = {
  in_cooldown: boolean;
  last_interrupt_at?: string;
  next_eligible_at?: string;
};

const COOLDOWN_WINDOW_MS = 10 * 60 * 1000; // docs/policy-rules.md §6.1
const PRIVACY_OVERRIDE_THRESHOLD = 0.8;     // docs/policy-rules.md §4

/**
 * Threshold gating per docs/policy-rules.md §3.
 * Returned action is the *proposed* action before downstream gates.
 */
function thresholdGate(total: number): { action: PolicyAction; reason: ReasonCode } {
  if (total < 0.3) return { action: "ignore", reason: "score_below_ignore_threshold" };
  if (total < 0.5) return { action: "remember", reason: "score_in_remember_band" };
  if (total < 0.7) return { action: "suggest", reason: "score_in_suggest_band" };
  if (total < 0.9) return { action: "ask_permission", reason: "score_in_ask_band" };
  return { action: "execute_preapproved", reason: "score_in_preapproved_band" };
}

function isInterruption(action: PolicyAction): boolean {
  return action === "suggest" || action === "ask_permission";
}

/**
 * Six-gate pipeline per docs/policy-rules.md §1.
 * Memory-governance and full permission-lookup stages land with AIR-022/023.
 */
export class PolicyEngine {
  private lastInterruptAt: Date | null = null;
  private now: () => Date;

  constructor(options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  /**
   * Legacy signature kept for callers that pass raw components.
   * Use {@link decideComposite} for the composite-aware path.
   */
  decide(event: ContextEvent, score: SalienceScore | SalienceComposite): PolicyAction {
    const composite: SalienceComposite =
      "components" in score
        ? score
        : { components: score, total: this.fallbackTotal(score) };

    return this.decideComposite(event, composite).action;
  }

  decideComposite(event: ContextEvent, composite: SalienceComposite): PolicyDecision {
    // Gate 1: threshold
    let { action, reason } = thresholdGate(composite.total);

    // Gate 2: privacy override (§4)
    if (
      composite.components.privacy_risk >= PRIVACY_OVERRIDE_THRESHOLD &&
      action !== "ignore" &&
      action !== "remember"
    ) {
      action = "ask_permission";
      reason = "privacy_risk_too_high";
    }

    // Gate 3: memory governance — pass-through until AIR-022 lands.

    // Gate 4: cooldown / interruption budget (§6)
    const cooldown = this.snapshotCooldownState();
    if (isInterruption(action) && cooldown.in_cooldown) {
      action = "remember";
      reason = "cooldown_active";
    }

    // Gate 5: permission lookup (§7) — minimal version pending Preapproval store.
    if (action === "execute_preapproved") {
      const preapproved = Boolean(event.payload["preapproved"]);
      if (preapproved) {
        reason = "policy_pre_approved";
      } else {
        action = "ask_permission";
        reason = "policy_consent_required";
      }
    }

    const stateAtDecision = cooldown;

    // Cooldown reset only fires when an interrupt actually surfaces.
    if (isInterruption(action) || action === "execute_preapproved") {
      this.lastInterruptAt = this.now();
    }

    return {
      action,
      reason,
      cooldown_state: stateAtDecision,
    };
  }

  private snapshotCooldownState(): CooldownState {
    if (!this.lastInterruptAt) return { in_cooldown: false };

    const now = this.now();
    const elapsed = now.getTime() - this.lastInterruptAt.getTime();
    if (elapsed >= COOLDOWN_WINDOW_MS) return { in_cooldown: false };

    const nextEligibleAt = new Date(this.lastInterruptAt.getTime() + COOLDOWN_WINDOW_MS);
    return {
      in_cooldown: true,
      last_interrupt_at: this.lastInterruptAt.toISOString(),
      next_eligible_at: nextEligibleAt.toISOString(),
    };
  }

  /**
   * For callers passing raw `SalienceScore` without a precomputed composite.
   * Mirrors the formula in docs/policy-rules.md §2; kept inline to avoid a
   * circular import on `compositeSalienceScore`.
   */
  private fallbackTotal(score: SalienceScore): number {
    const total =
      0.35 * score.urgency +
      0.25 * score.confidence +
      0.20 * score.user_value +
      0.10 * score.reversibility -
      0.25 * score.annoyance_cost -
      0.30 * score.privacy_risk;
    return Math.max(0, Math.min(1, total));
  }
}
