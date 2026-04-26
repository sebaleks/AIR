import type { EventDecision } from "../actions/types.ts";
import { ingestContextEvent } from "../context/ingest.ts";
import type { IngestContextEventInput } from "../context/types.ts";
import { MemoryStore } from "../memory/store.ts";
import { PolicyEngine } from "../policy/engine.ts";
import { scoreEventSalience } from "../salience/engine.ts";
import { leavingModeEvents } from "../demo/leaving_mode.ts";

export class AIROrchestrator {
  private memory = new MemoryStore();
  private policy = new PolicyEngine();
  private events: ReturnType<typeof ingestContextEvent>[] = [];
  private decisions: EventDecision[] = [];

  ingestEvent(input: IngestContextEventInput): EventDecision {
    const event = ingestContextEvent(input);
    const composite = scoreEventSalience(event);
    const action = this.policy.decide(event, composite.components);

    if (action !== "ignore") {
      this.memory.remember(event, `${event.kind} from ${event.source}`);
    }

    const decision: EventDecision = {
      eventId: event.id,
      action,
      score: composite.components,
      timestamp: new Date().toISOString(),
    };

    this.events.push(event);
    this.decisions.push(decision);

    return decision;
  }

  runLeavingModeDemo(): EventDecision[] {
    const now = new Date().toISOString();
    const demoEvents = leavingModeEvents(now);
    return demoEvents.map((demoEvent) => this.ingestEvent(demoEvent));
  }

  getState() {
    return {
      events: [...this.events],
      memories: this.memory.list(),
      decisions: [...this.decisions],
    };
  }
}
