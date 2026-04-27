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
import type { CueRenderer, EventSourceAdapter, RenderedCue } from "../adapters/types.ts";

const RESURFACE_RECURSION_CAP = 1;
const DEFAULT_CUE_TTL_MS = 4000;

export class AIROrchestrator {
  private memory = new MemoryStore();
  private policy = new PolicyEngine();
  private events: ContextEvent[] = [];
  private decisions: EventDecision[] = [];
  private adapters: EventSourceAdapter[] = [];
  private renderer: CueRenderer | null = null;

  /**
   * Plug any `EventSourceAdapter` into the orchestrator. The adapter
   * pushes normalized events into `ingestEvent` via the callback we
   * give to `start()`. See `docs/g2-alignment.md` § "Adapter architecture".
   */
  async registerAdapter(adapter: EventSourceAdapter): Promise<void> {
    this.adapters.push(adapter);
    await adapter.start((input) => {
      this.ingestEvent(input);
    });
  }

  async unregisterAll(): Promise<void> {
    for (const adapter of this.adapters) await adapter.stop();
    this.adapters = [];
  }

  setRenderer(renderer: CueRenderer | null): void {
    this.renderer = renderer;
  }

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

    this.maybeRender(event, eventDecision, decision.action);

    if (depth >= RESURFACE_RECURSION_CAP) {
      return [eventDecision];
    }

    const resurfaceDecisions = this.processResurfaces(event, depth);
    return [eventDecision, ...resurfaceDecisions];
  }

  private maybeRender(event: ContextEvent, decision: EventDecision, action: string): void {
    if (!this.renderer) return;
    if (action === "ignore" || action === "remember") return;

    const text = this.cueTextFor(event, action);
    if (!text) return;

    const cue: RenderedCue = {
      text,
      action: decision.action,
      event,
      decision,
      expiresInMs: DEFAULT_CUE_TTL_MS,
    };
    void this.renderer.render(cue);
  }

  /**
   * Map (event, action) → canonical cue string per docs/glasses-cue-copy.md.
   * Returns null when the action shouldn't surface a cue (or when we
   * don't have a template wired up yet — caller should remain silent).
   */
  private cueTextFor(event: ContextEvent, action: string): string | null {
    const minutes = event.payload["minutes_to_departure"];

    if (event.kind === "memory_resurfaced" && action === "suggest") {
      const summary = String(event.payload["summary"] ?? "");
      if (summary.toLowerCase().includes("victor") && summary.toLowerCase().includes("latency")) {
        return "Ask Victor about latency?";
      }
      return null;
    }

    if (event.kind === "calendar_event_upcoming" && action === "ask_permission") {
      const attendees = event.payload["attendees"];
      const name = Array.isArray(attendees) && attendees.length > 0 ? String(attendees[0]) : "them";
      return `Running 5 min late. Text ${name}?`;
    }

    if (event.kind === "user_confirmed_action" && action === "execute_preapproved") {
      const recipients = event.payload["recipients"];
      const name = Array.isArray(recipients) && recipients.length > 0 ? String(recipients[0]) : "them";
      return `Texted ${name}.`;
    }

    if (event.kind === "departure_signal" && action === "suggest" && typeof minutes === "number") {
      return `Leave in ${minutes} min?`;
    }

    return null;
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
