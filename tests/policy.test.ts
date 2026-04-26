import test from "node:test";
import assert from "node:assert/strict";
import { PolicyEngine } from "../src/policy/engine";
import { ContextEvent } from "../src/context/types";
import { SalienceScore } from "../src/salience/engine";

const engine = new PolicyEngine();

function baseEvent(payload: Record<string, unknown> = {}): ContextEvent {
  return {
    id: "evt_policy",
    kind: "departure_signal",
    source: "calendar",
    payload,
    timestamp: "2026-04-26T10:00:00.000Z"
  };
}

function score(overrides: Partial<SalienceScore>): SalienceScore {
  return {
    urgency: 0.5,
    confidence: 0.5,
    user_value: 0.5,
    annoyance_cost: 0.5,
    privacy_risk: 0.2,
    ...overrides
  };
}

test("PolicyEngine returns ask_permission on high privacy risk", () => {
  const action = engine.decide(baseEvent(), score({ privacy_risk: 0.9 }));
  assert.equal(action, "ask_permission");
});

test("PolicyEngine returns execute_preapproved when urgent + confident + preapproved", () => {
  const action = engine.decide(baseEvent({ preapproved: true }), score({ urgency: 0.8, confidence: 0.8 }));
  assert.equal(action, "execute_preapproved");
});

test("PolicyEngine returns suggest for strong but non-preapproved signal", () => {
  const action = engine.decide(baseEvent(), score({ urgency: 0.8, user_value: 0.8, annoyance_cost: 0.2 }));
  assert.equal(action, "suggest");
});
