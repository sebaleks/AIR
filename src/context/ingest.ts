import { randomUUID } from "node:crypto";
import type { ContextEvent, IngestContextEventInput } from "./types.ts";

export function ingestContextEvent(input: IngestContextEventInput): ContextEvent {
  return {
    id: input.id ?? randomUUID(),
    kind: input.kind,
    source: input.source,
    payload: input.payload,
    confidence: input.confidence,
    privacy_risk: input.privacy_risk,
    timestamp: input.timestamp,
  };
}
