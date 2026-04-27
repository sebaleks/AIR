import type { IngestContextEventInput } from "../context/types.ts";
import type { EventSourceAdapter } from "./types.ts";

/**
 * Non-G2 adapter that demonstrates the plugin pattern.
 * Drives the orchestrator with calendar-style events from any source —
 * test fixtures, a future Google Calendar API client, an iCal pull,
 * Notion calendar, etc.
 *
 * Constructor takes pre-built events; `start()` flushes them. Real
 * adapters would subscribe to a remote source and push as they arrive.
 */
export class MockCalendarAdapter implements EventSourceAdapter {
  readonly id = "mock_calendar";

  private events: IngestContextEventInput[];

  constructor(events: IngestContextEventInput[]) {
    this.events = events;
  }

  start(onEvent: (input: IngestContextEventInput) => void): void {
    for (const event of this.events) {
      onEvent({ ...event, source: this.id });
    }
  }

  stop(): void {
    // No-op: events are pushed synchronously in start().
  }
}
