/**
 * AIR end-to-end demo runner.
 *
 * Walks through all three flows with annotated input → salience score →
 * policy decision → HUD cue output. Designed to be the canonical demo
 * artifact: the thing a judge sees during the live run, the thing
 * recorded for AIR-051, and the thing Nick or Sebastian fires up
 * locally to sanity-check end-to-end behavior.
 *
 * Run with: `npm run demo`  (Node 22 required for --experimental-strip-types)
 */
import { ingestContextEvent } from "../context/ingest.ts";
import type { ContextEvent, IngestContextEventInput } from "../context/types.ts";
import { scoreEventSalience, type SalienceComposite } from "../salience/engine.ts";
import { PolicyEngine, type PolicyDecision } from "../policy/engine.ts";
import { leavingModeEvents } from "./leaving_mode.ts";
import { AIROrchestrator } from "../api/orchestrator.ts";
import {
  PREAPPROVAL_GRANT_CUE,
  RUNNING_LATE_CUE,
  TEXTED_CONFIRMATION_CUE,
} from "./consentful_action.ts";
import { VICTOR_LATENCY_CUE } from "./memory_capture.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";

const RULE = "─".repeat(64);
const HEAVY = "═".repeat(64);

function header(title: string): void {
  console.log(`\n${BOLD}${HEAVY}${RESET}`);
  console.log(`${BOLD}  ${title}${RESET}`);
  console.log(`${BOLD}${HEAVY}${RESET}\n`);
}

function flowBanner(name: string): void {
  console.log(`\n${CYAN}${BOLD}▶ ${name}${RESET}`);
  console.log(`${DIM}${RULE}${RESET}`);
}

function fmt(n: number): string {
  return n.toFixed(3);
}

function bandFor(total: number): string {
  if (total < 0.3) return "ignore";
  if (total < 0.5) return "remember";
  if (total < 0.7) return "suggest";
  if (total < 0.9) return "ask_permission";
  return "execute_preapproved";
}

function printEvent(label: string, event: ContextEvent): void {
  console.log(`\n  ${BOLD}${label}${RESET}: ${event.kind} ${DIM}from${RESET} ${event.source}`);
  const interestingKeys = [
    "minutes_to_departure",
    "minutes_to_event",
    "destination",
    "event",
    "attendees",
    "transcript",
    "preapproved",
    "action_template",
  ];
  const payloadStrs: string[] = [];
  for (const key of interestingKeys) {
    if (event.payload[key] !== undefined) {
      const value = event.payload[key];
      const display = Array.isArray(value) ? `[${value.join(", ")}]` : JSON.stringify(value);
      payloadStrs.push(`${DIM}${key}${RESET}=${display}`);
    }
  }
  if (payloadStrs.length > 0) {
    console.log(`    ${payloadStrs.join("  ")}`);
  }
  if (event.confidence !== undefined || event.privacy_risk !== undefined) {
    console.log(
      `    ${DIM}confidence${RESET}=${event.confidence ?? "—"}  ` +
        `${DIM}privacy_risk${RESET}=${event.privacy_risk ?? "—"}`,
    );
  }
}

function printSalience(composite: SalienceComposite): void {
  const c = composite.components;
  console.log(`\n    ${DIM}Salience composite:${RESET}`);
  console.log(`      urgency        ${fmt(c.urgency)}`);
  console.log(`      confidence     ${fmt(c.confidence)}`);
  console.log(`      user_value     ${fmt(c.user_value)}`);
  console.log(`      annoyance      ${fmt(c.annoyance_cost)}`);
  console.log(`      privacy_risk   ${fmt(c.privacy_risk)}`);
  console.log(`      reversibility  ${fmt(c.reversibility)}`);
  console.log(`      ${DIM}─────────────────────${RESET}`);
  console.log(
    `      ${BOLD}total${RESET}          ${BOLD}${fmt(composite.total)}${RESET}  ` +
      `${DIM}→${RESET}  ${BOLD}${bandFor(composite.total)}${RESET}${DIM} band${RESET}`,
  );
}

function printDecision(decision: PolicyDecision): void {
  const cooldownLine = decision.cooldown_state.in_cooldown
    ? `${YELLOW}active${RESET} (next eligible: ${decision.cooldown_state.next_eligible_at})`
    : "clear";
  console.log(
    `\n    ${BOLD}Decision:${RESET} ${MAGENTA}${decision.action}${RESET}  ` +
      `${DIM}reason:${RESET} ${decision.reason}`,
  );
  console.log(`    ${DIM}Cooldown:${RESET} ${cooldownLine}`);
}

function renderCue(action: string, cueOverride?: string): void {
  if (cueOverride) {
    console.log(`\n    ${GREEN}🟢 HUD:${RESET} ${BOLD}"${cueOverride}"${RESET}`);
    return;
  }
  if (action === "ignore" || action === "remember") {
    console.log(`\n    ${DIM}🔇 HUD: (silent — ${action})${RESET}`);
    return;
  }
  console.log(`\n    ${GREEN}🟢 HUD:${RESET} ${DIM}(cue elided — see docs/glasses-cue-copy.md)${RESET}`);
}

// --- Flow 1 — Leaving Mode -------------------------------------------------

function runLeavingMode(): void {
  flowBanner("Flow 1 — Leaving Mode");
  console.log(`${DIM}Two events arrive in quick succession. The first earns a cue;${RESET}`);
  console.log(`${DIM}the second hits the cooldown gate and is captured silently.${RESET}\n`);

  const policy = new PolicyEngine();
  const events = leavingModeEvents("2026-04-26T15:24:00.000Z");

  events.forEach((input, idx) => {
    const event = ingestContextEvent(input);
    const composite = scoreEventSalience(event);
    const decision = policy.decideComposite(event, composite);

    printEvent(`Event ${idx + 1}/${events.length}`, event);
    printSalience(composite);
    printDecision(decision);

    const minutes = event.payload["minutes_to_departure"];
    let cue: string | undefined;
    if (decision.action === "suggest" && typeof minutes === "number") {
      cue = `Leave in ${minutes} min?`;
    } else if (decision.action === "ask_permission" && typeof minutes === "number") {
      cue = `Leave now? (${minutes} min)`;
    }
    renderCue(decision.action, cue);
  });
}

// --- Flow 2 — Memory Capture ----------------------------------------------

function runMemoryCapture(): void {
  flowBanner("Flow 2 — Memory Capture");
  console.log(`${DIM}A casual self-reminder is captured silently. Later a${RESET}`);
  console.log(`${DIM}calendar event involving Victor surfaces it as a suggest.${RESET}\n`);

  const orchestrator = new AIROrchestrator();
  const result = orchestrator.runMemoryCaptureDemo();

  result.decisions.forEach((decision, idx) => {
    const event = orchestrator.getState().events[idx];
    if (!event) return;
    printEvent(`Event ${idx + 1}/${result.decisions.length}`, event);
    const composite = scoreEventSalience(event);
    printSalience(composite);
    console.log(
      `\n    ${BOLD}Decision:${RESET} ${MAGENTA}${decision.action}${RESET}` +
        `${DIM} (orchestrator-routed)${RESET}`,
    );
    if (decision.action === "remember") {
      renderCue("remember");
    } else if (decision.action === "suggest" && event.kind === "memory_resurfaced") {
      renderCue("suggest", VICTOR_LATENCY_CUE);
    } else {
      renderCue(decision.action);
    }
  });

  const memories = orchestrator.getState().memories;
  if (memories.length > 0) {
    console.log(`\n    ${DIM}Memory store contents:${RESET}`);
    for (const m of memories) {
      console.log(`      • ${m.id}  ${BOLD}${m.summary}${RESET}`);
      console.log(
        `        ${DIM}sensitivity=${m.sensitivity}  triggers=${m.resurface_triggers.length}` +
          `  expires=${m.expires_or_revalidates.slice(0, 10)}${RESET}`,
      );
    }
  }
}

// --- Flow 3 — Consentful Action -------------------------------------------

function runConsentfulAction(): void {
  flowBanner("Flow 3 — Consentful Action");
  console.log(`${DIM}Running-late detection triggers ask_permission. User taps yes;${RESET}`);
  console.log(`${DIM}message sends; user is offered a scoped preapproval.${RESET}\n`);

  const orchestrator = new AIROrchestrator();
  const result = orchestrator.runConsentfulActionDemo("yes");

  result.decisions.forEach((decision, idx) => {
    const event = orchestrator.getState().events[idx];
    if (!event) return;
    printEvent(`Event ${idx + 1}/${result.decisions.length}`, event);
    const composite = scoreEventSalience(event);
    printSalience(composite);
    console.log(`\n    ${BOLD}Decision:${RESET} ${MAGENTA}${decision.action}${RESET}`);

    let cue: string | undefined;
    if (decision.action === "ask_permission" && event.kind === "calendar_event_upcoming") {
      cue = RUNNING_LATE_CUE;
    } else if (decision.action === "execute_preapproved" && event.kind === "user_confirmed_action") {
      cue = TEXTED_CONFIRMATION_CUE;
    }
    renderCue(decision.action, cue);
  });

  if (result.cues.includes(PREAPPROVAL_GRANT_CUE)) {
    console.log(`\n    ${GREEN}🟢 HUD:${RESET} ${BOLD}"${PREAPPROVAL_GRANT_CUE}"${RESET}` +
      `  ${DIM}(post-execute follow-up; hackathon stub: not stored)${RESET}`);
  }
}

// --- Main ------------------------------------------------------------------

function main(): void {
  header("AIR — End-to-end demo runner");
  console.log(`  ${DIM}Three flows, six gates, a salience formula, a cooldown,${RESET}`);
  console.log(`  ${DIM}and a HUD that earns the right to speak.${RESET}`);

  runLeavingMode();
  runMemoryCapture();
  runConsentfulAction();

  console.log(`\n${BOLD}${HEAVY}${RESET}`);
  console.log(`  ${BOLD}Demo complete.${RESET} See ${CYAN}docs/demo-script.md${RESET} for the 2-minute narration.`);
  console.log(`${BOLD}${HEAVY}${RESET}\n`);
}

main();
