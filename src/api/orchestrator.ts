import type { EventDecision } from "../actions/types.ts";
import { ingestContextEvent } from "../context/ingest.ts";
import type { ContextEvent, IngestContextEventInput } from "../context/types.ts";
import { MemoryStore, type MemoryRecord } from "../memory/store.ts";
import { PolicyEngine } from "../policy/engine.ts";
import { scoreEventSalience } from "../salience/engine.ts";
import { leavingModeEvents } from "../demo/leaving_mode.ts";
import {
  inferMemoryShape,
  isSelfReminderMention,
  memoryCaptureEvents,
  VICTOR_LATENCY_CUE,
} from "../demo/memory_capture.ts";
import {
  PREAPPROVAL_GRANT_CUE,
  RUNNING_LATE_CUE,
  runningLateEvent,
  TEXTED_CONFIRMATION_CUE,
  type UserResponse,
  userConfirmedSendEvent,
} from "../demo/consentful_action.ts";

const RESURFACE_RECURSION_CAP = 1;

export class AIROrchestrator {
  private memory = new MemoryStore();
  private policy = new PolicyEngine();
  private events: ContextEvent[] = [];
  private decisions: EventDecision[] = [];

  /**
   * Ingest one event. Returns the primary decision plus any decisions
   * produced by memories that resurface as a side effect (capped recursion).
   */
  ingestEvent(input: IngestContextEventInput): EventDecision[] {
    return this.ingestInternal(input, 0);
  }

  private ingestInternal(input: IngestContextEventInput, depth: number): EventDecision[] {
    const event = ingestContextEvent(input);
    const composite = scoreEventSalience(event);
    const decision = this.policy.decideComposite(event, composite);

    if (decision.action === "remember") {
      this.captureMemory(event, input);
    }

    const eventDecision: EventDecision = {
      eventId: event.id,
      action: decision.action,
      score: composite.components,
      timestamp: new Date().toISOString(),
    };

    this.events.push(event);
    this.decisions.push(eventDecision);

    if (depth >= RESURFACE_RECURSION_CAP) {
      return [eventDecision];
    }

    const resurfaceDecisions = this.processResurfaces(event, depth);
    return [eventDecision, ...resurfaceDecisions];
  }

  private captureMemory(event: ContextEvent, input: IngestContextEventInput): MemoryRecord {
    if (isSelfReminderMention(input)) {
      const shape = inferMemoryShape(input);
      return this.memory.remember(event, {
        summary: shape.summary(input),
        sensitivity: "low",
        resurface_triggers: shape.triggers,
      });
    }
    return this.memory.remember(event, `${event.kind} from ${event.source}`);
  }

  private processResurfaces(event: ContextEvent, depth: number): EventDecision[] {
    // Exclude memories sourced from this same event so a freshly-captured
    // self_reminder doesn't immediately resurface against its own transcript.
    const candidates = this.memory
      .findResurfaceCandidates(event)
      .filter((m) => m.eventId !== event.id);
    if (candidates.length === 0) return [];

    const decisions: EventDecision[] = [];
    for (const memory of candidates) {
      this.memory.markResurfaced(memory.id, new Date().toISOString());
      const synthetic: IngestContextEventInput = {
        kind: "memory_resurfaced",
        source: "memory",
        timestamp: new Date().toISOString(),
        payload: {
          memory_id: memory.id,
          triggering_event_id: event.id,
          summary: memory.summary,
          // Salience signals for a resurfaced memory: the user previously
          // flagged this as worth remembering and a triggering context just
          // appeared, so user_value is high and annoyance is low. Urgency
          // tracks the triggering event when available.
          minutes_to_departure: Number(event.payload["minutes_to_event"] ?? 10),
          user_value: 0.85,
          annoyance_cost: 0.20,
        },
        confidence: memory.confidence,
        privacy_risk: 0.15,
      };
      const result = this.ingestInternal(synthetic, depth + 1);
      decisions.push(...result);
    }
    return decisions;
  }

  runLeavingModeDemo(): EventDecision[] {
    const now = new Date().toISOString();
    return leavingModeEvents(now).flatMap((evt) => this.ingestEvent(evt));
  }

  /**
   * Flow 3 — Consentful Action.
   * Returns the sequence of decisions and cues a judge would see, given
   * how the user responds to the initial ask_permission prompt.
   */
  runConsentfulActionDemo(
    userResponse: UserResponse = "yes",
  ): {
    decisions: EventDecision[];
    cues: string[];
    grantedPreapproval: boolean;
  } {
    const now = new Date().toISOString();
    const decisions: EventDecision[] = [];
    const cues: string[] = [];

    const askDecisions = this.ingestEvent(runningLateEvent(now));
    decisions.push(...askDecisions);
    if (askDecisions.some((d) => d.action === "ask_permission")) {
      cues.push(RUNNING_LATE_CUE);
    }

    if (userResponse !== "yes") {
      return { decisions, cues, grantedPreapproval: false };
    }

    const confirmDecisions = this.ingestEvent(userConfirmedSendEvent(now));
    decisions.push(...confirmDecisions);
    if (confirmDecisions.some((d) => d.action === "execute_preapproved")) {
      cues.push(TEXTED_CONFIRMATION_CUE);
      cues.push(PREAPPROVAL_GRANT_CUE);
    }

    // For the hackathon prototype the preapproval grant prompt always
    // appears but isn't acted on (no Preapproval store yet — would land
    // with full AIR-023 follow-up).
    return { decisions, cues, grantedPreapproval: false };
  }

  runMemoryCaptureDemo(): { decisions: EventDecision[]; cue: string | null } {
    const now = new Date().toISOString();
    const decisions = memoryCaptureEvents(now).flatMap((evt) => this.ingestEvent(evt));
    const surfaced = decisions.find((d) => d.action === "suggest");
    return {
      decisions,
      cue: surfaced ? VICTOR_LATENCY_CUE : null,
    };
  }

  getState() {
    return {
      events: [...this.events],
      memories: this.memory.list(),
      decisions: [...this.decisions],
    };
  }
}
