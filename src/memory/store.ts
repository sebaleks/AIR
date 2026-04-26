import type { ContextEvent } from "../context/types.ts";
import type { PolicyAction } from "../policy/engine.ts";

export type SensitivityLevel = "low" | "medium" | "high" | "critical";

export type ResurfaceTrigger =
  | { kind: "calendar_event"; match: { title_contains?: string; within_minutes?: number } }
  | { kind: "location"; match: { place_id: string } }
  | { kind: "time_window"; match: { weekday?: number; hour_start: number; hour_end: number } }
  | { kind: "person_mention"; match: { person: string } };

export type MemoryRecord = {
  id: string;
  eventId: string;
  summary: string;
  createdAt: string;

  // Governance per docs/context-schema.md §2 + docs/policy-rules.md §5.
  confidence: number;
  sensitivity: SensitivityLevel;
  allowed_actions: PolicyAction[];
  requires_confirmation_for: PolicyAction[];
  expires_or_revalidates: string;

  // Resurfacing per docs/flow-memory-capture.md §4.
  resurface_triggers: ResurfaceTrigger[];
  last_resurfaced?: string;
};

export type RememberInput = {
  summary: string;
  sensitivity?: SensitivityLevel;
  allowed_actions?: PolicyAction[];
  requires_confirmation_for?: PolicyAction[];
  expires_or_revalidates?: string;
  resurface_triggers?: ResurfaceTrigger[];
};

const DEFAULT_TTL_DAYS: Record<SensitivityLevel, number> = {
  low: 30,
  medium: 14,
  high: 7,
  critical: 1,
};

const DEFAULT_ALLOWED_ACTIONS: PolicyAction[] = ["suggest", "ask_permission"];
const DEFAULT_CONFIRMATION_REQUIRED: PolicyAction[] = ["execute_preapproved"];

export class MemoryStore {
  private records: MemoryRecord[] = [];
  private nextId = 1;

  /**
   * Record a memory with full governance metadata. Caller-supplied fields
   * override the defaults; anything missing is filled per
   * docs/flow-memory-capture.md §3 ("How the side-effect builds the MemoryRecord").
   */
  remember(event: ContextEvent, input: RememberInput | string): MemoryRecord {
    const normalized: RememberInput = typeof input === "string" ? { summary: input } : input;

    const sensitivity = normalized.sensitivity ?? "low";
    const ttlDays = DEFAULT_TTL_DAYS[sensitivity];
    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const confidence = typeof event.confidence === "number" ? event.confidence : 0.5;

    const record: MemoryRecord = {
      id: `mem_${this.nextId++}`,
      eventId: event.id,
      summary: normalized.summary,
      createdAt: createdAt.toISOString(),
      confidence,
      sensitivity,
      allowed_actions: normalized.allowed_actions ?? DEFAULT_ALLOWED_ACTIONS,
      requires_confirmation_for:
        normalized.requires_confirmation_for ?? DEFAULT_CONFIRMATION_REQUIRED,
      expires_or_revalidates:
        normalized.expires_or_revalidates ?? expiresAt.toISOString(),
      resurface_triggers: normalized.resurface_triggers ?? [],
    };

    this.records.push(record);
    return record;
  }

  /**
   * Find memories whose triggers match the incoming event.
   * Excludes expired memories and memories already surfaced for this trigger.
   */
  findResurfaceCandidates(event: ContextEvent, now: Date = new Date()): MemoryRecord[] {
    return this.records.filter((record) => {
      if (Date.parse(record.expires_or_revalidates) <= now.getTime()) return false;
      return record.resurface_triggers.some((trigger) =>
        triggerMatches(trigger, event, now),
      );
    });
  }

  markResurfaced(memoryId: string, at: string): void {
    const record = this.records.find((r) => r.id === memoryId);
    if (record) record.last_resurfaced = at;
  }

  list(): MemoryRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
    this.nextId = 1;
  }
}

function triggerMatches(
  trigger: ResurfaceTrigger,
  event: ContextEvent,
  now: Date,
): boolean {
  if (trigger.kind === "person_mention") {
    const attendees = event.payload["attendees"];
    if (Array.isArray(attendees) && attendees.some((a) => String(a).includes(trigger.match.person))) {
      return true;
    }
    const transcript = event.payload["transcript"];
    if (typeof transcript === "string" && transcript.includes(trigger.match.person)) {
      return true;
    }
    return false;
  }

  if (trigger.kind === "calendar_event") {
    if (event.kind !== "calendar_event_upcoming") return false;
    const title = String(event.payload["event"] ?? event.payload["title"] ?? "");
    const titleMatches = trigger.match.title_contains
      ? title.toLowerCase().includes(trigger.match.title_contains.toLowerCase())
      : true;
    if (!titleMatches) return false;
    if (trigger.match.within_minutes !== undefined) {
      const minutes = Number(event.payload["minutes_to_event"] ?? Number.POSITIVE_INFINITY);
      return Math.abs(minutes) <= trigger.match.within_minutes;
    }
    return true;
  }

  if (trigger.kind === "location") {
    return event.kind === "location_change" && event.payload["place_id"] === trigger.match.place_id;
  }

  if (trigger.kind === "time_window") {
    const weekday = trigger.match.weekday ?? now.getDay();
    if (now.getDay() !== weekday) return false;
    const hour = now.getHours() + now.getMinutes() / 60;
    return hour >= trigger.match.hour_start && hour < trigger.match.hour_end;
  }

  return false;
}
