import test from "node:test";
import assert from "node:assert/strict";
import { PolicyEngine } from "../src/policy/engine.ts";
import type { ContextEvent } from "../src/context/types.ts";
import type { SalienceComposite, SalienceScore } from "../src/salience/engine.ts";

function baseEvent(payload: Record<string, unknown> = {}): ContextEvent {
  return {
    id: "evt_policy",
    kind: "departure_signal",
    source: "calendar",
    payload,
    timestamp: "2026-04-26T10:00:00.000Z",
  };
}

function score(overrides: Partial<SalienceScore> = {}): SalienceScore {
  return {
    urgency: 0.5,
    confidence: 0.5,
    user_value: 0.5,
    annoyance_cost: 0.5,
    privacy_risk: 0.2,
    reversibility: 1,
    ...overrides,
  };
}

function composite(total: number, overrides: Partial<SalienceScore> = {}): SalienceComposite {
  return { components: score(overrides), total };
}

test("threshold gate: total < 0.30 → ignore", () => {
  const engine = new PolicyEngine();
  const decision = engine.decideComposite(baseEvent(), composite(0.2));
  assert.equal(decision.action, "ignore");
  assert.equal(decision.reason, "score_below_ignore_threshold");
});

test("threshold gate: 0.30 ≤ total < 0.50 → remember", () => {
  const engine = new PolicyEngine();
  const decision = engine.decideComposite(baseEvent(), composite(0.4));
  assert.equal(decision.action, "remember");
  assert.equal(decision.reason, "score_in_remember_band");
});

test("threshold gate: 0.50 ≤ total < 0.70 → suggest", () => {
  const engine = new PolicyEngine();
  const decision = engine.decideComposite(baseEvent(), composite(0.6));
  assert.equal(decision.action, "suggest");
  assert.equal(decision.reason, "score_in_suggest_band");
});

test("threshold gate: 0.70 ≤ total < 0.90 → ask_permission", () => {
  const engine = new PolicyEngine();
  const decision = engine.decideComposite(baseEvent(), composite(0.8));
  assert.equal(decision.action, "ask_permission");
  assert.equal(decision.reason, "score_in_ask_band");
});

test("threshold gate: total ≥ 0.90 → execute_preapproved when preapproved=true", () => {
  const engine = new PolicyEngine();
  const decision = engine.decideComposite(baseEvent({ preapproved: true }), composite(0.95));
  assert.equal(decision.action, "execute_preapproved");
  assert.equal(decision.reason, "policy_pre_approved");
});

test("threshold gate: total ≥ 0.90 downgrades to ask_permission when not preapproved", () => {
  const engine = new PolicyEngine();
  const decision = engine.decideComposite(baseEvent(), composite(0.95));
  assert.equal(decision.action, "ask_permission");
  assert.equal(decision.reason, "policy_consent_required");
});

test("privacy override: privacy_risk ≥ 0.80 escalates suggest → ask_permission", () => {
  const engine = new PolicyEngine();
  const decision = engine.decideComposite(
    baseEvent(),
    composite(0.6, { privacy_risk: 0.85 }),
  );
  assert.equal(decision.action, "ask_permission");
  assert.equal(decision.reason, "privacy_risk_too_high");
});

test("privacy override: does not escalate ignore or remember", () => {
  const engine = new PolicyEngine();
  const ignoreDecision = engine.decideComposite(
    baseEvent(),
    composite(0.2, { privacy_risk: 0.9 }),
  );
  assert.equal(ignoreDecision.action, "ignore");

  const rememberEngine = new PolicyEngine();
  const rememberDecision = rememberEngine.decideComposite(
    baseEvent(),
    composite(0.4, { privacy_risk: 0.9 }),
  );
  assert.equal(rememberDecision.action, "remember");
});

test("cooldown: second suggest within 10 min downgrades to remember", () => {
  let now = new Date("2026-04-26T08:24:00Z");
  const engine = new PolicyEngine({ now: () => now });

  const first = engine.decideComposite(baseEvent(), composite(0.6));
  assert.equal(first.action, "suggest");
  assert.equal(first.cooldown_state.in_cooldown, false);

  // Five minutes later, another suggest-worthy event arrives.
  now = new Date("2026-04-26T08:29:00Z");
  const second = engine.decideComposite(baseEvent(), composite(0.6));
  assert.equal(second.action, "remember");
  assert.equal(second.reason, "cooldown_active");
  assert.equal(second.cooldown_state.in_cooldown, true);
  assert.equal(second.cooldown_state.next_eligible_at, "2026-04-26T08:34:00.000Z");
});

test("cooldown: window lifts after 10 min, next interrupt allowed", () => {
  let now = new Date("2026-04-26T08:24:00Z");
  const engine = new PolicyEngine({ now: () => now });

  engine.decideComposite(baseEvent(), composite(0.6));

  // Eleven minutes later — outside the window.
  now = new Date("2026-04-26T08:35:00Z");
  const second = engine.decideComposite(baseEvent(), composite(0.6));
  assert.equal(second.action, "suggest");
  assert.equal(second.reason, "score_in_suggest_band");
});

test("legacy decide(event, score) still returns just the action", () => {
  const engine = new PolicyEngine();
  const action = engine.decide(baseEvent(), score({ urgency: 0.9, confidence: 0.9, user_value: 0.9, annoyance_cost: 0.1, privacy_risk: 0.1 }));
  // High composite total → ask_permission (no preapproval flag)
  assert.equal(action, "ask_permission");
});
