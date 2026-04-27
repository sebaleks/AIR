import type { ContextEvent, IngestContextEventInput } from "../context/types.ts";
import type { EventDecision } from "../actions/types.ts";
import type { PolicyAction } from "../policy/engine.ts";

/**
 * Plug any external signal source into the orchestrator without the
 * engine knowing where events came from. Implementations: G2 bridge
 * (audioControl + imuControl + onEvenHubEvent), calendar adapter,
 * geolocation adapter, mock fixtures, etc.
 *
 * Spec: docs/g2-alignment.md § "Adapter architecture".
 */
export interface EventSourceAdapter {
  /** Stable identifier — appears in `ContextEvent.source`. */
  readonly id: string;

  /**
   * Begin emitting events. Implementations must call `onEvent` whenever
   * they have a normalized event ready. Throwing during `start` should
   * be reserved for unrecoverable wiring failures.
   */
  start(onEvent: (input: IngestContextEventInput) => void): Promise<void> | void;

  /** Tear down subscriptions / close handles. Idempotent. */
  stop(): Promise<void> | void;
}

/**
 * Output side of the same modularity story. Whenever a `PolicyDecision`
 * produces something the user should see, the orchestrator hands a
 * `RenderedCue` to the active renderer. Implementations: G2 HUD
 * (textContainerUpgrade), CLI runner (ANSI text), test mock (in-memory
 * capture).
 */
export interface CueRenderer {
  readonly id: string;

  render(cue: RenderedCue): Promise<void> | void;

  /** Optional — clear / dismiss any current cue. */
  clear?(): Promise<void> | void;
}

export type RenderedCue = {
  /** The exact string to surface; matches a template from docs/glasses-cue-copy.md. */
  text: string;

  /** Which `PolicyAction` produced this cue — drives renderer styling. */
  action: PolicyAction;

  /** The original event + decision, for renderers that want richer context. */
  event: ContextEvent;
  decision: EventDecision;

  /** Auto-dismiss after N ms; 0 means manual dismiss. */
  expiresInMs: number;
};
