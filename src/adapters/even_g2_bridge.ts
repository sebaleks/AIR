import type { IngestContextEventInput } from "../context/types.ts";
import type { EventSourceAdapter } from "./types.ts";

/**
 * Stub adapter for the Even G2 SDK (`@evenrealities/even_hub_sdk`).
 *
 * This file is type-only stubs so the rest of the codebase compiles
 * without the SDK installed. The intent is to show the exact shape
 * the production adapter takes — see `docs/g2-alignment.md` § "EvenAppBridge"
 * for the documented method surface.
 *
 * Wiring contract:
 *   - `audioControl(true)` opens the 4-mic array → 16 kHz PCM frames.
 *     We pipe frames into an STT (cloud or on-device); the resulting
 *     transcript becomes a `voice_mention` event.
 *   - `imuControl(true, reportFrq)` emits `IMU_DATA_REPORT` events.
 *     We optionally derate `annoyance_cost` based on motion magnitude.
 *   - `onEvenHubEvent(cb)` delivers `CLICK_EVENT` / `DOUBLE_CLICK_EVENT` etc.
 *     These don't produce `ContextEvent`s — they're consumed by the
 *     `CueRenderer` to advance HUD state machines (yes/no on a cue).
 *
 * Voice transcription is intentionally pluggable: the constructor takes
 * a `transcribe` function so we can swap Whisper / Deepgram / on-device
 * STT without touching the engine.
 */

// --- Minimal types reproduced from the SDK docs (no runtime import) ---

type EvenHubEventType = number;

type AudioFrame = {
  /** 16 kHz PCM signed 16-bit LE mono. */
  pcm: Int16Array;
  timestamp: string;
};

type ImuSample = {
  x: number;
  y: number;
  z: number;
};

interface EvenAppBridge {
  audioControl(open: boolean): Promise<void>;
  imuControl(open: boolean, reportFrq?: string): Promise<void>;
  onEvenHubEvent(cb: (e: { eventType: EvenHubEventType; payload?: unknown }) => void): void;
  // Other documented methods omitted — only what the adapter needs is typed here.
}

export type Transcriber = (frames: AudioFrame[]) => Promise<{
  transcript: string;
  confidence: number;
  intent?: "self_reminder" | "action_request" | "ambient";
}>;

export class EvenG2BridgeAdapter implements EventSourceAdapter {
  readonly id = "even_g2";

  private bridge: EvenAppBridge | null = null;
  private transcribe: Transcriber;
  private onEvent: ((input: IngestContextEventInput) => void) | null = null;

  constructor(opts: { bridge: EvenAppBridge; transcribe: Transcriber }) {
    this.bridge = opts.bridge;
    this.transcribe = opts.transcribe;
  }

  async start(onEvent: (input: IngestContextEventInput) => void): Promise<void> {
    if (!this.bridge) throw new Error("EvenG2BridgeAdapter: bridge not provided");
    this.onEvent = onEvent;

    // Voice: open mic and pipe frames through the transcriber on a
    // utterance boundary (silence gap > N ms). Production impl should
    // do voice-activity detection; this stub illustrates wiring only.
    await this.bridge.audioControl(true);

    // IMU: optional, used to refine annoyance_cost in salience scoring.
    // Production: subscribe and emit `motion_signal` events at low cadence.
    await this.bridge.imuControl(true, "P500");

    // Touch / lifecycle events do NOT become ContextEvents — they're
    // consumed by the CueRenderer to advance HUD state. This adapter
    // ignores them on purpose.
  }

  async stop(): Promise<void> {
    if (this.bridge) {
      await this.bridge.audioControl(false);
      await this.bridge.imuControl(false);
    }
    this.onEvent = null;
  }

  /**
   * Called by the bridge subscription (when wired up) with a buffered
   * audio utterance. Runs STT and emits a `voice_mention` event.
   * Exposed for tests / replay scenarios.
   */
  async ingestUtterance(frames: AudioFrame[], nowIso: string): Promise<void> {
    if (!this.onEvent) return;
    const { transcript, confidence, intent } = await this.transcribe(frames);
    this.onEvent({
      kind: "voice_mention",
      source: this.id,
      timestamp: nowIso,
      payload: { transcript, intent: intent ?? "ambient" },
      confidence,
      privacy_risk: 0.4, // voice is medium-sensitivity per docs/privacy-model.md
    });
  }

  /**
   * Called by the IMU subscription with a normalized motion sample.
   */
  ingestMotion(sample: ImuSample, nowIso: string): void {
    if (!this.onEvent) return;
    const magnitude = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2);
    this.onEvent({
      kind: "motion_signal",
      source: this.id,
      timestamp: nowIso,
      payload: { magnitude, x: sample.x, y: sample.y, z: sample.z },
      confidence: 0.95,
      privacy_risk: 0.1,
    });
  }
}
