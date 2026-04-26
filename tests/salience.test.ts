import test from "node:test";
import assert from "node:assert/strict";

import { compositeSalienceScore, createSalienceComposite, scoreEventSalience, type SalienceScore } from "../src/salience/engine.ts";

const round = (value: number): number => Math.round(value * 1000) / 1000;

test("compositeSalienceScore follows policy-rules formula (table-driven)", () => {
  const cases: Array<{ name: string; score: SalienceScore; expected: number }> = [
    {
      name: "high urgency and confidence with low costs",
      score: {
        urgency: 0.9,
        confidence: 0.92,
        user_value: 0.85,
        annoyance_cost: 0.2,
        privacy_risk: 0.2,
        reversibility: 1,
      },
      expected: 0.705,
    },
    {
      name: "high privacy can drive score to zero after clamping",
      score: {
        urgency: 0.1,
        confidence: 0.15,
        user_value: 0.1,
        annoyance_cost: 0.8,
        privacy_risk: 1,
        reversibility: 0,
      },
      expected: 0,
    },
    {
      name: "fully positive components still capped at 0.9",
      score: {
        urgency: 1,
        confidence: 1,
        user_value: 1,
        annoyance_cost: 0,
        privacy_risk: 0,
        reversibility: 1,
      },
      expected: 0.9,
    },
  ];

  for (const fixture of cases) {
    assert.equal(round(compositeSalienceScore(fixture.score)), fixture.expected, fixture.name);
  }
});

test("reversibility positively contributes 0.10 * reversibility", () => {
  const baseline: SalienceScore = {
    urgency: 0.55,
    confidence: 0.55,
    user_value: 0.55,
    annoyance_cost: 0.2,
    privacy_risk: 0.2,
    reversibility: 0,
  };

  const withReversibleAction = { ...baseline, reversibility: 1 };

  const noReversibility = compositeSalienceScore(baseline);
  const fullReversibility = compositeSalienceScore(withReversibleAction);

  assert.equal(round(fullReversibility - noReversibility), 0.1);
});

test("scoreEventSalience reads reversibility from event payload", () => {
  const event = {
    id: "evt_1",
    kind: "departure_signal",
    source: "calendar",
    timestamp: "2026-04-26T00:00:00.000Z",
    payload: {
      minutes_to_departure: 6,
      reversibility: 0.4,
      user_value: 0.8,
      annoyance_cost: 0.2,
    },
    confidence: 0.9,
    privacy_risk: 0.1,
  };

  const composite = scoreEventSalience(event);

  assert.equal(composite.components.reversibility, 0.4);
  assert.equal(composite.total, createSalienceComposite(composite.components).total);
});
