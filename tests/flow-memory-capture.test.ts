import test from "node:test";
import assert from "node:assert/strict";
import { AIROrchestrator } from "../src/api/orchestrator.ts";

test("Flow 2 — capture: voice_mention with self_reminder lands in MemoryStore with triggers", () => {
  const orchestrator = new AIROrchestrator();

  const captureDecisions = orchestrator.ingestEvent({
    kind: "voice_mention",
    source: "voice",
    timestamp: "2026-04-26T18:10:00.000Z",
    payload: {
      transcript: "I should remember to ask Victor about the latency issue",
      intent: "self_reminder",
      user_value: 0.80,
      annoyance_cost: 0.20,
    },
    confidence: 0.81,
    privacy_risk: 0.2,
  });

  assert.equal(captureDecisions.length, 1);
  assert.equal(captureDecisions[0].action, "remember");

  const state = orchestrator.getState();
  assert.equal(state.memories.length, 1);
  const memory = state.memories[0];
  assert.equal(memory.summary, "Ask Victor about latency issue");
  assert.equal(memory.sensitivity, "low");
  assert.deepEqual(memory.allowed_actions, ["suggest", "ask_permission"]);
  assert.deepEqual(memory.requires_confirmation_for, ["execute_preapproved"]);
  assert.equal(memory.resurface_triggers.length, 2);
  assert.equal(memory.resurface_triggers[0].kind, "person_mention");
});

test("Flow 2 — resurface: calendar event with Victor surfaces the memory as suggest", () => {
  const orchestrator = new AIROrchestrator();

  // Capture
  orchestrator.ingestEvent({
    kind: "voice_mention",
    source: "voice",
    timestamp: "2026-04-26T18:10:00.000Z",
    payload: {
      transcript: "I should remember to ask Victor about the latency issue",
      intent: "self_reminder",
      user_value: 0.80,
      annoyance_cost: 0.20,
    },
    confidence: 0.81,
    privacy_risk: 0.2,
  });

  // Trigger
  const triggerDecisions = orchestrator.ingestEvent({
    kind: "calendar_event_upcoming",
    source: "calendar",
    timestamp: "2026-04-27T09:14:00.000Z",
    payload: {
      event: "1:1 with Victor",
      attendees: ["Victor"],
      minutes_to_event: 15,
      user_value: 0.78,
      annoyance_cost: 0.25,
    },
    confidence: 0.95,
    privacy_risk: 0.2,
  });

  // Two decisions should come back: the trigger event itself plus the resurface.
  assert.equal(triggerDecisions.length, 2);
  const resurface = triggerDecisions.find((d) => d.action === "suggest");
  assert.ok(resurface, "expected a suggest decision from the resurfaced memory");

  const state = orchestrator.getState();
  const memory = state.memories[0];
  assert.ok(memory.last_resurfaced, "last_resurfaced should be set");
});

test("Flow 2 — runMemoryCaptureDemo emits the canonical Victor-latency cue", () => {
  const orchestrator = new AIROrchestrator();
  const result = orchestrator.runMemoryCaptureDemo();
  assert.equal(result.cue, "Ask Victor about latency?");
});

test("Flow 2 — memory governance: allowed_actions defaults exclude execute_preapproved", () => {
  const orchestrator = new AIROrchestrator();
  orchestrator.ingestEvent({
    kind: "voice_mention",
    source: "voice",
    timestamp: "2026-04-26T18:10:00.000Z",
    payload: {
      transcript: "I should remember to ask Victor about the latency issue",
      intent: "self_reminder",
      user_value: 0.80,
      annoyance_cost: 0.20,
    },
    confidence: 0.81,
    privacy_risk: 0.2,
  });

  const memory = orchestrator.getState().memories[0];
  assert.ok(!memory.allowed_actions.includes("execute_preapproved"));
  assert.ok(memory.requires_confirmation_for.includes("execute_preapproved"));
});
