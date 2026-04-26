import test from "node:test";
import assert from "node:assert/strict";
import { AIROrchestrator } from "../src/api/orchestrator.ts";

test("Flow 3 — running-late event produces ask_permission cue", () => {
  const orchestrator = new AIROrchestrator();
  const result = orchestrator.runConsentfulActionDemo("timeout");

  assert.ok(result.cues.includes("Running 5 min late. Text Alex?"));
  assert.ok(
    result.decisions.some((d) => d.action === "ask_permission"),
    "expected an ask_permission decision",
  );
});

test("Flow 3 — user yes triggers execute_preapproved + confirmation cue", () => {
  const orchestrator = new AIROrchestrator();
  const result = orchestrator.runConsentfulActionDemo("yes");

  assert.ok(result.cues.includes("Running 5 min late. Text Alex?"));
  assert.ok(result.cues.includes("Texted Alex."));
  assert.ok(result.cues.includes("Don't ask again for Alex?"));
  assert.ok(
    result.decisions.some((d) => d.action === "execute_preapproved"),
    "expected an execute_preapproved decision",
  );
});

test("Flow 3 — user no/timeout suppresses send and confirmation cues", () => {
  for (const response of ["no", "timeout"] as const) {
    const orchestrator = new AIROrchestrator();
    const result = orchestrator.runConsentfulActionDemo(response);

    assert.ok(!result.cues.includes("Texted Alex."), `cue "Texted Alex." should not appear when user response is ${response}`);
    assert.ok(!result.cues.includes("Don't ask again for Alex?"));
    assert.ok(
      !result.decisions.some((d) => d.action === "execute_preapproved"),
      `no execute_preapproved when user response is ${response}`,
    );
  }
});

test("Flow 3 — preapproval grant is offered but not yet stored (hackathon stub)", () => {
  const orchestrator = new AIROrchestrator();
  const result = orchestrator.runConsentfulActionDemo("yes");
  assert.equal(result.grantedPreapproval, false);
});
