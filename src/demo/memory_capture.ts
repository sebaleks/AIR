import type { IngestContextEventInput } from "../context/types.ts";
import type { MemoryRecord, ResurfaceTrigger } from "../memory/store.ts";

/**
 * Flow 2 — Memory Capture demo seed.
 * See docs/flow-memory-capture.md for the full scenario.
 *
 * Two events fire, in order:
 *   1. Capture: a voice_mention with intent "self_reminder" — should produce
 *      a `remember` decision and store a governed MemoryRecord.
 *   2. Trigger: a calendar_event_upcoming with the named person as attendee —
 *      should match the memory's `person_mention` trigger and surface a
 *      `suggest` cue: "Ask Victor about latency?"
 */
export function memoryCaptureEvents(nowIso: string): IngestContextEventInput[] {
  return [
    {
      kind: "voice_mention",
      source: "voice",
      timestamp: nowIso,
      payload: {
        transcript: "I should remember to ask Victor about the latency issue",
        intent: "self_reminder",
        // Salience signals tuned so the composite total lands in the
        // 0.30–0.50 (remember) band per docs/policy-rules.md §3.
        // Voice mentions don't have a natural urgency signal, so we
        // lean on user_value, low annoyance_cost, low privacy_risk.
        user_value: 0.80,
        annoyance_cost: 0.20,
      },
      confidence: 0.81,
      privacy_risk: 0.2,
    },
    {
      kind: "calendar_event_upcoming",
      source: "calendar",
      timestamp: nowIso,
      payload: {
        event: "1:1 with Victor",
        minutes_to_event: 15,
        attendees: ["Victor"],
        // The triggering event itself should land in `remember` band so it
        // doesn't fire its own cue (which would also trigger the cooldown
        // and downgrade the resurfaced memory). The resurfaced synthetic
        // event is the one that should reach the `suggest` band.
        user_value: 0.78,
        annoyance_cost: 0.25,
      },
      confidence: 0.95,
      privacy_risk: 0.2,
    },
  ];
}

/**
 * Triggers attached to the captured memory. In production these would be
 * inferred from transcript NLP (proper nouns, domain nouns); for the
 * hackathon demo we hard-code them.
 */
export const VICTOR_LATENCY_TRIGGERS: ResurfaceTrigger[] = [
  { kind: "person_mention", match: { person: "Victor" } },
  { kind: "calendar_event", match: { title_contains: "latency", within_minutes: 1440 } },
];

/**
 * Expected canonical cue when the memory resurfaces.
 * Source: docs/glasses-cue-copy.md §5 Flow 2.
 */
export const VICTOR_LATENCY_CUE = "Ask Victor about latency?";

/**
 * Helper to recognize a self_reminder voice mention so the orchestrator
 * can tag the resulting memory with the right governance shape.
 */
export function isSelfReminderMention(input: IngestContextEventInput): boolean {
  return (
    input.kind === "voice_mention" &&
    input.payload?.["intent"] === "self_reminder"
  );
}

export type MemoryGovernanceTemplate = {
  summary: (input: IngestContextEventInput) => string;
  triggers: ResurfaceTrigger[];
};

/**
 * Hackathon-grade rule that maps a self_reminder transcript to a memory
 * shape. For the seeded "Victor latency" scenario it returns the canonical
 * triggers; for any other self_reminder it returns a generic memory with
 * no triggers (which means it'll never resurface — fine for the demo).
 */
export function inferMemoryShape(
  input: IngestContextEventInput,
): MemoryGovernanceTemplate {
  const transcript = String(input.payload?.["transcript"] ?? "");
  const summary = transcript
    .replace(/^I should remember to /i, "")
    .trim();

  if (transcript.includes("Victor") && transcript.toLowerCase().includes("latency")) {
    return {
      summary: () => "Ask Victor about latency issue",
      triggers: VICTOR_LATENCY_TRIGGERS,
    };
  }

  return { summary: () => summary, triggers: [] };
}

export type MemoryCaptureSummary = {
  capture: { decisionAction: string; memory: MemoryRecord | null };
  resurface: { decisionAction: string; cue: string | null; matchedMemoryId?: string };
};
