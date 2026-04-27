import test from "node:test";
import assert from "node:assert/strict";
import { AIROrchestrator } from "../src/api/orchestrator.ts";
import { MockCalendarAdapter } from "../src/adapters/mock_calendar.ts";
import { MockCueRenderer } from "../src/adapters/mock_cue_renderer.ts";

test("EventSourceAdapter: registered adapter pushes events into orchestrator", async () => {
  const orchestrator = new AIROrchestrator();
  const adapter = new MockCalendarAdapter([
    {
      kind: "departure_signal",
      source: "calendar",
      timestamp: "2026-04-26T15:24:00.000Z",
      payload: { minutes_to_departure: 8, destination: "office", preapproved: false },
      confidence: 0.92,
      privacy_risk: 0.2,
    },
  ]);

  await orchestrator.registerAdapter(adapter);

  const state = orchestrator.getState();
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].source, "mock_calendar");
  assert.equal(state.decisions.length, 1);
});

test("CueRenderer: receives a RenderedCue when a decision surfaces", () => {
  const orchestrator = new AIROrchestrator();
  const renderer = new MockCueRenderer();
  orchestrator.setRenderer(renderer);

  orchestrator.ingestEvent({
    kind: "departure_signal",
    source: "calendar",
    timestamp: "2026-04-26T15:24:00.000Z",
    payload: { minutes_to_departure: 8, destination: "office" },
    confidence: 0.92,
    privacy_risk: 0.2,
  });

  assert.equal(renderer.rendered.length, 1);
  assert.equal(renderer.rendered[0].action, "suggest");
  assert.equal(renderer.rendered[0].text, "Leave in 8 min?");
});

test("CueRenderer: silent decisions do not render", () => {
  const orchestrator = new AIROrchestrator();
  const renderer = new MockCueRenderer();
  orchestrator.setRenderer(renderer);

  // Score should land in `ignore` or `remember` band.
  orchestrator.ingestEvent({
    kind: "departure_signal",
    source: "calendar",
    timestamp: "2026-04-26T15:24:00.000Z",
    payload: { minutes_to_departure: 120 }, // far future → low urgency
    confidence: 0.3,
    privacy_risk: 0.5,
  });

  assert.equal(renderer.rendered.length, 0);
});

test("CueRenderer: Flow 2 resurface produces the canonical Victor cue", () => {
  const orchestrator = new AIROrchestrator();
  const renderer = new MockCueRenderer();
  orchestrator.setRenderer(renderer);

  orchestrator.runMemoryCaptureDemo();

  assert.ok(
    renderer.texts().includes("Ask Victor about latency?"),
    `expected canonical cue; got ${JSON.stringify(renderer.texts())}`,
  );
});

test("CueRenderer: Flow 3 produces both the ask and the confirmation cues", () => {
  const orchestrator = new AIROrchestrator();
  const renderer = new MockCueRenderer();
  orchestrator.setRenderer(renderer);

  orchestrator.runConsentfulActionDemo("yes");

  const texts = renderer.texts();
  assert.ok(texts.includes("Running 5 min late. Text Alex?"), `got ${JSON.stringify(texts)}`);
  assert.ok(texts.includes("Texted Alex."), `got ${JSON.stringify(texts)}`);
});
