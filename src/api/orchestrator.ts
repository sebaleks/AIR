import { EventDecision } from "../actions/types";
import { ingestContextEvent } from "../context/ingest";
import { IngestContextEventInput } from "../context/types";
import { MemoryStore } from "../memory/store";
import { PolicyEngine } from "../policy/engine";
import { SalienceEngine } from "../salience/engine";
import { leavingModeEvents } from "../demo/leaving_mode";

export class SenseRouteOrchestrator {
  private memory = new MemoryStore();
  private salience = new SalienceEngine();
  private policy = new PolicyEngine();
  private events: ReturnType<typeof ingestContextEvent>[] = [];
  private decisions: EventDecision[] = [];

  ingestEvent(input: IngestContextEventInput): EventDecision {
    const event = ingestContextEvent(input);
    const score = this.salience.score(event);
    const action = this.policy.decide(event, score);

    if (action !== "ignore") {
      this.memory.remember(event, `${event.kind} from ${event.source}`);
    }

    const decision: EventDecision = {
      eventId: event.id,
      action,
      score,
      timestamp: new Date().toISOString()
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
      decisions: [...this.decisions]
    };
  }
}
