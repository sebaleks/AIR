import test from "node:test";
import assert from "node:assert/strict";
import { SalienceEngine } from "../src/salience/engine";
import { ContextEvent } from "../src/context/types";

function makeEvent(minutes: number): ContextEvent {
  return {
    id: "evt_1",
    kind: "departure_signal",
    source: "calendar",
    payload: { minutes_to_departure: minutes },
    timestamp: "2026-04-26T10:00:00.000Z",
    confidence: 0.9,
    privacy_risk: 0.2
  };
}

test("SalienceEngine scores urgency higher for closer departure", () => {
  const engine = new SalienceEngine();
  const far = engine.score(makeEvent(45));
  const close = engine.score(makeEvent(5));

  assert.ok(close.urgency > far.urgency);
  assert.ok(close.user_value >= far.user_value);
});

test("SalienceEngine keeps all dimensions in range", () => {
  const engine = new SalienceEngine();
  const score = engine.score(makeEvent(10));

  Object.values(score).forEach((value) => {
    assert.ok(value >= 0 && value <= 1);
  });
});
